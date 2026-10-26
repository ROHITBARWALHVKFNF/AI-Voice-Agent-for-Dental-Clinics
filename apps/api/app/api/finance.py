from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.clinic_expense import ClinicExpense
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.organization import Organization
from app.models.patient import Patient
from app.models.treatment import PatientTreatment
from app.models.user import User


router = APIRouter(prefix="/finance", tags=["Clinic Finance"])

PAYMENT_METHODS = {"cash", "upi", "card", "insurance_claim"}
INVOICE_STATUSES = {"draft", "sent", "partially_paid", "paid", "void"}


class InvoiceCreate(BaseModel):
    patient_id: UUID
    invoice_number: str = Field(min_length=1, max_length=50)
    invoice_date: date
    due_date: Optional[date] = None
    subtotal: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    status: Literal["draft", "sent"] = "draft"
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    patient_id: UUID
    invoice_number: str
    invoice_date: date
    due_date: Optional[date]
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    status: str
    notes: Optional[str]


class PaymentCreate(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payment_method: Literal["cash", "upi", "card", "insurance_claim"]
    paid_at: Optional[datetime] = None
    reference: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    invoice_id: UUID
    amount: Decimal
    payment_method: str
    paid_at: datetime
    reference: Optional[str]
    notes: Optional[str]


class ExpenseCreate(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    incurred_at: Optional[datetime] = None
    payment_method: Optional[str] = Field(default=None, max_length=30)
    reference: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    category: str
    description: str
    amount: Decimal
    incurred_at: datetime
    payment_method: Optional[str]
    reference: Optional[str]
    notes: Optional[str]


def _invoice_totals(db: Session, invoice_id: UUID) -> tuple[Decimal, Decimal]:
    invoice = db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    received = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.invoice_id == invoice_id,
            Payment.organization_id == invoice.organization_id,
        )
    )
    return invoice.total_amount, Decimal(received or 0)


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="User is not linked to a clinic")

    patient = db.scalar(
        select(Patient).where(
            Patient.id == data.patient_id,
            Patient.organization_id == org_id,
        )
    )
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    if data.discount_amount > data.subtotal + data.tax_amount:
        raise HTTPException(status_code=400, detail="Discount cannot exceed subtotal plus tax")

    total = data.subtotal + data.tax_amount - data.discount_amount
    if total < 0:
        raise HTTPException(status_code=400, detail="Invoice total cannot be negative")

    duplicate = db.scalar(
        select(Invoice.id).where(
            Invoice.organization_id == org_id,
            Invoice.invoice_number == data.invoice_number,
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Invoice number already exists in this clinic")

    invoice = Invoice(
        organization_id=org_id,
        patient_id=data.patient_id,
        invoice_number=data.invoice_number,
        invoice_date=data.invoice_date,
        due_date=data.due_date,
        subtotal=data.subtotal,
        tax_amount=data.tax_amount,
        discount_amount=data.discount_amount,
        total_amount=total,
        status=data.status,
        notes=data.notes,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/invoices", response_model=list[InvoiceResponse])
def list_invoices(
    status: Optional[str] = Query(default=None),
    patient_id: Optional[UUID] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    stmt = select(Invoice).where(Invoice.organization_id == org_id)
    if status:
        if status not in INVOICE_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid invoice status")
        stmt = stmt.where(Invoice.status == status)
    if patient_id:
        stmt = stmt.where(Invoice.patient_id == patient_id)
    return db.scalars(stmt.order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc())).all()


@router.post("/payments", response_model=PaymentResponse, status_code=201)
def record_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    invoice = db.scalar(
        select(Invoice).where(
            Invoice.id == data.invoice_id,
            Invoice.organization_id == org_id,
        )
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status in {"draft", "void"}:
        raise HTTPException(status_code=400, detail="Payments are not allowed for draft or void invoices")

    received = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.invoice_id == invoice.id,
            Payment.organization_id == org_id,
        )
    )
    already_received = Decimal(received or 0)
    remaining = invoice.total_amount - already_received
    if data.amount > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds remaining balance of {remaining}",
        )

    payment = Payment(
        organization_id=org_id,
        invoice_id=invoice.id,
        amount=data.amount,
        payment_method=data.payment_method,
        paid_at=data.paid_at or datetime.now().astimezone(),
        reference=data.reference,
        notes=data.notes,
    )
    db.add(payment)
    db.flush()

    new_received = already_received + data.amount
    if new_received >= invoice.total_amount:
        invoice.status = "paid"
    elif new_received > 0:
        invoice.status = "partially_paid"

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments", response_model=list[PaymentResponse])
def list_payments(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    invoice_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    stmt = select(Payment).where(Payment.organization_id == org_id)
    if start_date:
        stmt = stmt.where(Payment.paid_at >= datetime.combine(start_date, time.min).astimezone())
    if end_date:
        stmt = stmt.where(Payment.paid_at < datetime.combine(end_date + timedelta(days=1), time.min).astimezone())
    if invoice_id:
        stmt = stmt.where(Payment.invoice_id == invoice_id)
    return db.scalars(stmt.order_by(Payment.paid_at.desc())).all()


@router.post("/expenses", response_model=ExpenseResponse, status_code=201)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    if org_id is None:
        raise HTTPException(status_code=403, detail="User is not linked to a clinic")

    expense = ClinicExpense(
        organization_id=org_id,
        category=data.category.strip(),
        description=data.description.strip(),
        amount=data.amount,
        incurred_at=data.incurred_at or datetime.now().astimezone(),
        payment_method=data.payment_method,
        reference=data.reference,
        notes=data.notes,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/expenses", response_model=list[ExpenseResponse])
def list_expenses(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    stmt = select(ClinicExpense).where(ClinicExpense.organization_id == org_id)
    if start_date:
        stmt = stmt.where(ClinicExpense.incurred_at >= datetime.combine(start_date, time.min).astimezone())
    if end_date:
        stmt = stmt.where(ClinicExpense.incurred_at < datetime.combine(end_date + timedelta(days=1), time.min).astimezone())
    if category:
        stmt = stmt.where(ClinicExpense.category == category)
    return db.scalars(stmt.order_by(ClinicExpense.incurred_at.desc())).all()


@router.get("/summary")
def finance_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")

    org_id = current_user.organization_id
    start_dt = datetime.combine(start_date, time.min).astimezone()
    end_dt = datetime.combine(end_date + timedelta(days=1), time.min).astimezone()

    collected = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.organization_id == org_id,
            Payment.paid_at >= start_dt,
            Payment.paid_at < end_dt,
        )
    )
    expenses = db.scalar(
        select(func.coalesce(func.sum(ClinicExpense.amount), 0)).where(
            ClinicExpense.organization_id == org_id,
            ClinicExpense.incurred_at >= start_dt,
            ClinicExpense.incurred_at < end_dt,
        )
    )

    collected_amount = Decimal(collected or 0)
    expense_amount = Decimal(expenses or 0)


    completed_treatment_value = db.scalar(
        select(func.coalesce(func.sum(PatientTreatment.price), 0)).where(
            PatientTreatment.organization_id == org_id,
            PatientTreatment.status == "completed",
            PatientTreatment.completed_at >= start_dt,
            PatientTreatment.completed_at < end_dt,
        )
    )

    billed_amount = db.scalar(
        select(func.coalesce(func.sum(Invoice.total_amount), 0)).where(
            Invoice.organization_id == org_id,
            Invoice.invoice_date >= start_date,
            Invoice.invoice_date <= end_date,
            Invoice.status.notin_(["draft", "void"]),
        )
    )
    organization = db.get(Organization, org_id)
    return {
        "start_date": start_date,
        "end_date": end_date,
        "actual_collections": collected_amount,
        "completed_treatment_value": Decimal(completed_treatment_value or 0),
        "billed_amount": Decimal(billed_amount or 0),
        "expenses": expense_amount,
        "profit": collected_amount - expense_amount,
        "currency": organization.currency if organization else "INR",
        "note": "Profit is collections minus expenses recorded in this system; unentered expenses are excluded.",
    }



