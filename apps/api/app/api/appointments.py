
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.appointment import Appointment
from app.models.clinic_schedule_override import ClinicScheduleOverride
from app.models.doctor import Doctor
from app.models.doctor_schedule import DoctorSchedule
from app.models.doctor_schedule_break import DoctorScheduleBreak
from app.models.doctor_schedule_override import DoctorScheduleOverride
from app.models.doctor_slot_capacity import DoctorSlotCapacity
from app.models.patient import Patient
from app.models.user import User
from app.services.availability_service import (
    AvailabilityService,
    add_months,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])

CLINIC_TIMEZONE = ZoneInfo("Asia/Kolkata")
SLOT_DURATION_MINUTES = 30

ACTIVE_STATUSES = [
    "scheduled",
    "confirmed",
    "pending",
]

ALL_STATUSES = [
    "scheduled",
    "confirmed",
    "pending",
    "completed",
    "cancelled",
    "no_show",
    "rescheduled",
]

NON_BLOCKING_STATUSES = {
    "cancelled",
    "completed",
    "no_show",
}


# -------------------------------------------------------------------
# TIME AND BOOKING WINDOW HELPERS
# -------------------------------------------------------------------

def localize(value: datetime) -> datetime:
    """Convert a datetime to clinic-local time."""
    if value.tzinfo is None:
        return value.replace(tzinfo=CLINIC_TIMEZONE)

    return value.astimezone(CLINIC_TIMEZONE)


def validate_booking_window(requested_date: date) -> None:
    """Allow bookings from today through three calendar months ahead."""
    today = datetime.now(CLINIC_TIMEZONE).date()
    max_booking_date = add_months(today, 3)

    if requested_date < today:
        raise HTTPException(
            status_code=400,
            detail="Cannot book an appointment in the past",
        )

    if requested_date > max_booking_date:
        raise HTTPException(
            status_code=400,
            detail=(
                "Appointments can only be booked up to "
                f"{max_booking_date.isoformat()} "
                "(3 months in advance)"
            ),
        )


# -------------------------------------------------------------------
# REQUEST AND RESPONSE SCHEMAS
# -------------------------------------------------------------------

class AppointmentCreate(BaseModel):
    patient_id: UUID
    doctor_id: UUID
    start_time: datetime
    end_time: datetime
    appointment_type: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.start_time >= self.end_time:
            raise ValueError(
                "end_time must be after start_time"
            )

        return self


class AppointmentUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    doctor_id: Optional[UUID] = None
    status: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None

    @model_validator(mode="after")
    def validate_time_range(self):
        if (
            self.start_time is not None
            and self.end_time is not None
            and self.start_time >= self.end_time
        ):
            raise ValueError(
                "end_time must be after start_time"
            )

        return self


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    patient_id: UUID
    doctor_id: UUID
    start_time: datetime
    end_time: datetime
    status: str
    appointment_type: Optional[str]
    notes: Optional[str]
    cancellation_reason: Optional[str]


# -------------------------------------------------------------------
# DOCTOR SCHEDULE
# -------------------------------------------------------------------

def get_doctor_schedule(
    db: Session,
    organization_id: UUID,
    doctor_id: UUID,
    requested_date: date,
):
    return db.scalar(
        select(DoctorSchedule).where(
            DoctorSchedule.organization_id == organization_id,
            DoctorSchedule.doctor_id == doctor_id,
            DoctorSchedule.day_of_week == requested_date.weekday(),
        )
    )


# -------------------------------------------------------------------
# APPOINTMENT VALIDATION AND PER-SLOT CAPACITY
# -------------------------------------------------------------------

def validate_capacity(
    db: Session,
    organization_id: UUID,
    doctor_id: UUID,
    start_time: datetime,
    end_time: datetime,
    exclude_appointment_id: Optional[UUID] = None,
):
    """
    Validate a booking against doctor hours, clinic hours, breaks,
    fixed 30-minute duration, booking window, and custom slot capacity.
    """

    start_time = localize(start_time)
    end_time = localize(end_time)

    if start_time >= end_time:
        raise HTTPException(
            status_code=400,
            detail="Appointment end time must be after start time",
        )

    # Every appointment occupies exactly one 30-minute slot.
    if end_time - start_time != timedelta(
        minutes=SLOT_DURATION_MINUTES
    ):
        raise HTTPException(
            status_code=400,
            detail="Appointments must be exactly 30 minutes long",
        )

    # Slots must start at HH:00 or HH:30, with no seconds.
    if (
        start_time.minute not in (0, 30)
        or start_time.second != 0
        or start_time.microsecond != 0
    ):
        raise HTTPException(
            status_code=400,
            detail="Appointment must start on a 30-minute boundary",
        )

    requested_date = start_time.date()
    validate_booking_window(requested_date)

    if end_time.date() != requested_date:
        raise HTTPException(
            status_code=400,
            detail="Appointments must start and end on the same local date",
        )

    if start_time <= datetime.now(CLINIC_TIMEZONE):
        raise HTTPException(
            status_code=400,
            detail="Cannot book an appointment in the past",
        )

    # Find weekly schedule and date-specific override.
    schedule = get_doctor_schedule(
        db,
        organization_id,
        doctor_id,
        requested_date,
    )

    doctor_override = db.scalar(
        select(DoctorScheduleOverride).where(
            DoctorScheduleOverride.organization_id == organization_id,
            DoctorScheduleOverride.doctor_id == doctor_id,
            DoctorScheduleOverride.override_date == requested_date,
        )
    )

    if (
        doctor_override is not None
        and doctor_override.organization_id != organization_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Doctor schedule organization does not match",
        )

    if schedule is None and doctor_override is None:
        raise HTTPException(
            status_code=400,
            detail="Doctor schedule not configured for this date",
        )

    doctor_hours = AvailabilityService.get_doctor_hours(
        db,
        doctor_id,
        requested_date,
    )

    if not doctor_hours["is_working"]:
        raise HTTPException(
            status_code=400,
            detail=doctor_hours["reason"] or "Doctor is not working",
        )

    clinic_hours = AvailabilityService.get_clinic_hours(
        db,
        organization_id,
        requested_date,
    )

    if not clinic_hours["is_open"]:
        raise HTTPException(
            status_code=400,
            detail=clinic_hours["reason"] or "Clinic is closed",
        )

    opening = datetime.combine(
        requested_date,
        clinic_hours["open_time"],
        tzinfo=CLINIC_TIMEZONE,
    )

    closing = datetime.combine(
        requested_date,
        clinic_hours["close_time"],
        tzinfo=CLINIC_TIMEZONE,
    )

    doctor_start = datetime.combine(
        requested_date,
        doctor_hours["start_time"],
        tzinfo=CLINIC_TIMEZONE,
    )

    doctor_end = datetime.combine(
        requested_date,
        doctor_hours["end_time"],
        tzinfo=CLINIC_TIMEZONE,
    )

    working_start = max(opening, doctor_start)
    working_end = min(closing, doctor_end)

    if start_time < working_start or end_time > working_end:
        raise HTTPException(
            status_code=400,
            detail="Appointment is outside clinic or doctor working hours",
        )

    # Reject appointments overlapping recurring doctor breaks.
    breaks = db.scalars(
        select(DoctorScheduleBreak).where(
            DoctorScheduleBreak.organization_id == organization_id,
            DoctorScheduleBreak.doctor_id == doctor_id,
            DoctorScheduleBreak.day_of_week == requested_date.weekday(),
        )
    ).all()

    start_clock = start_time.time().replace(tzinfo=None)
    end_clock = end_time.time().replace(tzinfo=None)

    for item in breaks:
        if (
            start_clock < item.end_time
            and end_clock > item.start_time
        ):
            raise HTTPException(
                status_code=400,
                detail="Appointment overlaps the doctor's break",
            )

    # Load custom capacity for this doctor, weekday, and slot.
    custom_capacity = db.scalar(
        select(DoctorSlotCapacity).where(
            DoctorSlotCapacity.organization_id == organization_id,
            DoctorSlotCapacity.doctor_id == doctor_id,
            DoctorSlotCapacity.day_of_week == requested_date.weekday(),
            DoctorSlotCapacity.slot_start == start_clock,
        )
    )

    # Fall back to the weekly schedule capacity when no custom
    # value has been saved for this specific slot.
    default_capacity = (
        schedule.slot_capacity
        if schedule is not None
        else 1
    )

    capacity = (
        custom_capacity.capacity
        if custom_capacity is not None
        else default_capacity
    )

    if capacity is None or capacity < 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid doctor slot capacity",
        )

    if capacity == 0:
        raise HTTPException(
            status_code=409,
            detail="This appointment slot has been disabled",
        )

    # Count active appointments overlapping this exact slot.
    query = select(Appointment).where(
        Appointment.organization_id == organization_id,
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_(ACTIVE_STATUSES),
        Appointment.start_time < end_time,
        Appointment.end_time > start_time,
    )

    if exclude_appointment_id is not None:
        query = query.where(
            Appointment.id != exclude_appointment_id
        )

    overlapping = db.scalars(query).all()
    booked = len(overlapping)
    remaining = max(capacity - booked, 0)

    if booked >= capacity:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Appointment capacity is full",
                "capacity": capacity,
                "booked": booked,
                "remaining": remaining,
            },
        )


# -------------------------------------------------------------------
# DOCTOR LOCKING
# -------------------------------------------------------------------

def lock_doctor(
    db: Session,
    organization_id: UUID,
    doctor_id: UUID,
):
    """
    Lock the doctor row while validating and saving a booking.
    PostgreSQL holds this lock until the transaction completes.
    """
    doctor = db.scalar(
        select(Doctor)
        .where(
            Doctor.id == doctor_id,
            Doctor.organization_id == organization_id,
        )
        .with_for_update()
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    if not doctor.is_active:
        raise HTTPException(
            status_code=400,
            detail="Doctor is inactive",
        )

    return doctor


# -------------------------------------------------------------------
# CREATE APPOINTMENT
# -------------------------------------------------------------------

@router.post("", response_model=AppointmentResponse)
def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = current_user.organization_id

    try:
        patient = db.scalar(
            select(Patient).where(
                Patient.id == appointment_data.patient_id,
                Patient.organization_id == organization_id,
            )
        )

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient not found",
            )

        lock_doctor(
            db,
            organization_id,
            appointment_data.doctor_id,
        )

        validate_capacity(
            db=db,
            organization_id=organization_id,
            doctor_id=appointment_data.doctor_id,
            start_time=appointment_data.start_time,
            end_time=appointment_data.end_time,
        )

        appointment = Appointment(
            organization_id=organization_id,
            patient_id=appointment_data.patient_id,
            doctor_id=appointment_data.doctor_id,
            start_time=localize(appointment_data.start_time),
            end_time=localize(appointment_data.end_time),
            status="scheduled",
            appointment_type=appointment_data.appointment_type,
            notes=appointment_data.notes,
        )

        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        return appointment

    except Exception:
        db.rollback()
        raise


# -------------------------------------------------------------------
# LIST APPOINTMENTS
# -------------------------------------------------------------------

@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(Appointment)
        .where(
            Appointment.organization_id == current_user.organization_id
        )
        .order_by(Appointment.start_time.asc())
    ).all()


# -------------------------------------------------------------------
# GET SINGLE APPOINTMENT
# -------------------------------------------------------------------

@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointment = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.organization_id == current_user.organization_id,
        )
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found",
        )

    return appointment


# -------------------------------------------------------------------
# UPDATE OR RESCHEDULE APPOINTMENT
# -------------------------------------------------------------------

@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: UUID,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = current_user.organization_id

    try:
        appointment = db.scalar(
            select(Appointment).where(
                Appointment.id == appointment_id,
                Appointment.organization_id == organization_id,
            )
        )

        if not appointment:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found",
            )

        changes = appointment_data.model_dump(exclude_unset=True)

        new_doctor_id = changes.get(
            "doctor_id",
            appointment.doctor_id,
        )

        new_start = changes.get(
            "start_time",
            appointment.start_time,
        )

        new_end = changes.get(
            "end_time",
            appointment.end_time,
        )

        new_status = changes.get(
            "status",
            appointment.status,
        )

        if new_status not in ALL_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid appointment status",
            )

        # Normalize datetimes before comparing or validating them.
        new_start = localize(new_start)
        new_end = localize(new_end)

        # Revalidate any operation that creates, reactivates, or moves
        # an active appointment.
        requires_capacity_check = (
            new_status in ACTIVE_STATUSES
            and (
                new_status != appointment.status
                or new_doctor_id != appointment.doctor_id
                or new_start != localize(appointment.start_time)
                or new_end != localize(appointment.end_time)
            )
        )

        if requires_capacity_check:
            lock_doctor(
                db,
                organization_id,
                new_doctor_id,
            )

            validate_capacity(
                db=db,
                organization_id=organization_id,
                doctor_id=new_doctor_id,
                start_time=new_start,
                end_time=new_end,
                exclude_appointment_id=appointment.id,
            )

        for field in (
            "start_time",
            "end_time",
            "doctor_id",
            "status",
            "appointment_type",
            "notes",
            "cancellation_reason",
        ):
            if field in changes:
                setattr(
                    appointment,
                    field,
                    (
                        new_start
                        if field == "start_time"
                        else new_end
                        if field == "end_time"
                        else changes[field]
                    ),
                )

        db.commit()
        db.refresh(appointment)

        return appointment

    except Exception:
        db.rollback()
        raise


# -------------------------------------------------------------------
# CANCEL APPOINTMENT
# -------------------------------------------------------------------

@router.delete("/{appointment_id}", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        appointment = db.scalar(
            select(Appointment).where(
                Appointment.id == appointment_id,
                Appointment.organization_id == current_user.organization_id,
            )
        )

        if not appointment:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found",
            )

        appointment.status = "cancelled"

        db.commit()
        db.refresh(appointment)

        return appointment

    except Exception:
        db.rollback()
        raise
