"""
Revenue and profit dashboard numbers.

This reads the clinic's EXISTING finance tables (invoices, payments,
clinic_expenses) and creates nothing new:

  revenue  = payments received (money actually collected)
  expenses = clinic_expenses recorded
  profit   = revenue - expenses
"""
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.appointment import Appointment
from app.models.clinic_expense import ClinicExpense
from app.models.invoice import Invoice
from app.models.organization import Organization
from app.models.patient import Patient
from app.models.payment import Payment
from app.models.treatment import PatientTreatment, Treatment
from app.models.user import User


router = APIRouter(prefix="/analytics", tags=["Analytics"])

ACTIVE_STATUSES = ("scheduled", "confirmed", "pending")
OPEN_INVOICE_STATUSES = ("sent", "partially_paid")
NOT_BILLED_STATUSES = ("draft", "void")
MAX_RANGE_DAYS = 1830


def f(value) -> float:
    return float(value) if value is not None else 0.0


def get_org_tz(db: Session, organization_id: UUID) -> ZoneInfo:
    """The clinic's own timezone, used to decide which 'day' something is in."""
    org = db.get(Organization, organization_id)
    name = (org.timezone if org else None) or "Asia/Kolkata"

    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo("Asia/Kolkata")


def bounds(tz: ZoneInfo, start: date, end: date) -> tuple[datetime, datetime]:
    """Local midnight at the start of `start` up to local midnight after `end`."""
    return (
        datetime.combine(start, time.min, tzinfo=tz),
        datetime.combine(end + timedelta(days=1), time.min, tzinfo=tz),
    )


def money_totals(
    db: Session, org_id: UUID, tz: ZoneInfo, start: date, end: date
) -> tuple[float, float]:
    """(revenue collected, expenses) for a date range."""
    s, e = bounds(tz, start, end)

    revenue = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.organization_id == org_id,
            Payment.paid_at >= s,
            Payment.paid_at < e,
        )
    )
    expenses = db.scalar(
        select(func.coalesce(func.sum(ClinicExpense.amount), 0)).where(
            ClinicExpense.organization_id == org_id,
            ClinicExpense.incurred_at >= s,
            ClinicExpense.incurred_at < e,
        )
    )

    return f(revenue), f(expenses)


def open_balance(
    db: Session, org_id: UUID, due_on: date | None = None
) -> float:
    """Unpaid balance on invoices that have been sent but not fully paid."""
    invoice_filter = [
        Invoice.organization_id == org_id,
        Invoice.status.in_(OPEN_INVOICE_STATUSES),
    ]
    if due_on is not None:
        invoice_filter.append(Invoice.due_date == due_on)

    total = db.scalar(
        select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(*invoice_filter)
    )
    paid = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .join(Invoice, Invoice.id == Payment.invoice_id)
        .where(Payment.organization_id == org_id, *invoice_filter)
    )

    return f(Decimal(total or 0) - Decimal(paid or 0))


def appointment_counts(
    db: Session, org_id: UUID, tz: ZoneInfo, start: date, end: date
) -> dict:
    s, e = bounds(tz, start, end)

    rows = db.execute(
        select(Appointment.status, func.count())
        .where(
            Appointment.organization_id == org_id,
            Appointment.start_time >= s,
            Appointment.start_time < e,
        )
        .group_by(Appointment.status)
    ).all()

    counts = {status: n for status, n in rows}

    return {
        "total": sum(counts.values()),
        "completed": counts.get("completed", 0),
        "cancelled": counts.get("cancelled", 0),
        "no_show": counts.get("no_show", 0),
        "upcoming": sum(counts.get(s, 0) for s in ACTIVE_STATUSES),
    }


def billed_total(db: Session, org_id: UUID, start: date, end: date):
    """(count, total) of invoices dated in the range, excluding draft/void."""
    count, total = db.execute(
        select(func.count(), func.coalesce(func.sum(Invoice.total_amount), 0)).where(
            Invoice.organization_id == org_id,
            Invoice.status.notin_(NOT_BILLED_STATUSES),
            Invoice.invoice_date >= start,
            Invoice.invoice_date <= end,
        )
    ).one()

    return count, f(total)


def day_summary(db: Session, org_id: UUID, tz: ZoneInfo, d: date) -> dict:
    revenue, expenses = money_totals(db, org_id, tz, d, d)
    _, billed = billed_total(db, org_id, d, d)

    return {
        "date": d.isoformat(),
        "collected": revenue,
        "expenses": expenses,
        "profit": round(revenue - expenses, 2),
        "billed": billed,
        "appointments": appointment_counts(db, org_id, tz, d, d),
    }


# ---------------------------------------------------------------------------
# Front-page snapshot: yesterday, today, tomorrow
# ---------------------------------------------------------------------------

@router.get("/snapshot")
def snapshot(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    tz = get_org_tz(db, org_id)
    org = db.get(Organization, org_id)

    today = datetime.now(tz).date()
    tomorrow = today + timedelta(days=1)

    s, e = bounds(tz, tomorrow, tomorrow)

    booked = db.scalars(
        select(Appointment).where(
            Appointment.organization_id == org_id,
            Appointment.start_time >= s,
            Appointment.start_time < e,
            Appointment.status.in_(ACTIVE_STATUSES),
        )
    ).all()

    # Appointments carry no price, so expected income is estimated by matching
    # the appointment type to a service name in the clinic's catalog.
    prices = {
        t.name.strip().lower(): t.default_price
        for t in db.scalars(
            select(Treatment).where(
                Treatment.organization_id == org_id,
                Treatment.is_active.is_(True),
            )
        ).all()
        if t.default_price is not None
    }

    expected = Decimal("0")
    unpriced = 0

    for appt in booked:
        price = prices.get((appt.appointment_type or "").strip().lower())
        if price is None:
            unpriced += 1
        else:
            expected += price

    return {
        "currency": (org.currency if org and org.currency else "INR"),
        "yesterday": day_summary(db, org_id, tz, today - timedelta(days=1)),
        "today": day_summary(db, org_id, tz, today),
        "tomorrow": {
            "date": tomorrow.isoformat(),
            "appointments_booked": len(booked),
            "expected_revenue": f(expected),
            "unpriced_appointments": unpriced,
            "invoices_due": open_balance(db, org_id, due_on=tomorrow),
        },
    }


# ---------------------------------------------------------------------------
# Any date range: revenue, expenses, profit, chart series
# ---------------------------------------------------------------------------

def month_keys(start: date, end: date) -> list[str]:
    keys = []
    cur = date(start.year, start.month, 1)

    while cur <= end:
        keys.append(cur.strftime("%Y-%m"))
        cur = date(cur.year + (1 if cur.month == 12 else 0), (cur.month % 12) + 1, 1)

    return keys


@router.get("/overview")
def overview(
    start_date: date,
    end_date: date,
    group_by: str = Query(default="auto", pattern="^(auto|day|month)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be on or after start date")

    span = (end_date - start_date).days + 1

    if span > MAX_RANGE_DAYS:
        raise HTTPException(status_code=400, detail="Please choose a range of 5 years or less")

    org_id = current_user.organization_id
    tz = get_org_tz(db, org_id)
    org = db.get(Organization, org_id)
    s, e = bounds(tz, start_date, end_date)

    mode = group_by if group_by != "auto" else ("day" if span <= 62 else "month")

    def key_for(d: date) -> str:
        return d.isoformat() if mode == "day" else d.strftime("%Y-%m")

    if mode == "day":
        keys = [(start_date + timedelta(days=i)).isoformat() for i in range(span)]
    else:
        keys = month_keys(start_date, end_date)

    buckets = {k: {"key": k, "revenue": 0.0, "expenses": 0.0} for k in keys}

    by_method: dict[str, float] = {}
    by_category: dict[str, float] = {}

    payments = db.execute(
        select(Payment.amount, Payment.payment_method, Payment.paid_at).where(
            Payment.organization_id == org_id,
            Payment.paid_at >= s,
            Payment.paid_at < e,
        )
    ).all()

    for amount, method, paid_at in payments:
        k = key_for(paid_at.astimezone(tz).date())
        if k in buckets:
            buckets[k]["revenue"] += f(amount)
        by_method[method] = by_method.get(method, 0.0) + f(amount)

    expense_rows = db.execute(
        select(ClinicExpense.amount, ClinicExpense.category, ClinicExpense.incurred_at).where(
            ClinicExpense.organization_id == org_id,
            ClinicExpense.incurred_at >= s,
            ClinicExpense.incurred_at < e,
        )
    ).all()

    for amount, category, incurred_at in expense_rows:
        k = key_for(incurred_at.astimezone(tz).date())
        if k in buckets:
            buckets[k]["expenses"] += f(amount)
        by_category[category] = by_category.get(category, 0.0) + f(amount)

    series = []
    for b in buckets.values():
        b["revenue"] = round(b["revenue"], 2)
        b["expenses"] = round(b["expenses"], 2)
        b["profit"] = round(b["revenue"] - b["expenses"], 2)
        series.append(b)

    revenue = round(sum(b["revenue"] for b in series), 2)
    total_expenses = round(sum(b["expenses"] for b in series), 2)

    invoice_count, billed = billed_total(db, org_id, start_date, end_date)

    # Completed treatments in the period, grouped by service. Uses the price
    # saved on the patient's treatment, falling back to the catalog price.
    top_services = db.execute(
        select(
            Treatment.name,
            func.coalesce(
                func.sum(func.coalesce(PatientTreatment.price, Treatment.default_price, 0)),
                0,
            ).label("amount"),
            func.count().label("count"),
        )
        .select_from(PatientTreatment)
        .join(Treatment, Treatment.id == PatientTreatment.treatment_id)
        .where(
            PatientTreatment.organization_id == org_id,
            PatientTreatment.status == "completed",
            PatientTreatment.completed_at >= s,
            PatientTreatment.completed_at < e,
        )
        .group_by(Treatment.name)
        .order_by(desc("amount"))
        .limit(5)
    ).all()

    new_patients = db.scalar(
        select(func.count()).select_from(Patient).where(
            Patient.organization_id == org_id,
            Patient.created_at >= s,
            Patient.created_at < e,
        )
    )

    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=span - 1)
    prev_revenue, prev_expenses = money_totals(db, org_id, tz, prev_start, prev_end)

    def ranked(d: dict[str, float]) -> list[dict]:
        return [
            {"name": name, "amount": round(amount, 2)}
            for name, amount in sorted(d.items(), key=lambda x: x[1], reverse=True)
        ]

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "group_by": mode,
        "currency": (org.currency if org and org.currency else "INR"),
        "totals": {
            "revenue": revenue,
            "expenses": total_expenses,
            "profit": round(revenue - total_expenses, 2),
            "billed": billed,
            "invoice_count": invoice_count,
            "outstanding_total": open_balance(db, org_id),
            "new_patients": new_patients or 0,
            "appointments": appointment_counts(db, org_id, tz, start_date, end_date),
        },
        "previous": {
            "revenue": prev_revenue,
            "expenses": prev_expenses,
            "profit": round(prev_revenue - prev_expenses, 2),
        },
        "series": series,
        "by_method": ranked(by_method),
        "by_category": ranked(by_category),
        "top_services": [
            {"name": name, "amount": f(amount), "count": int(count or 0)}
            for name, amount, count in top_services
        ],
    }