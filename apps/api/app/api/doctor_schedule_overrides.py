from datetime import date, time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.doctor_schedule_override import DoctorScheduleOverride


router = APIRouter(
    prefix="/doctor-schedule-overrides",
    tags=["Doctor Schedule Overrides"],
)


class DoctorScheduleOverrideCreate(BaseModel):
    override_date: date
    is_working: bool = False
    start_time: time | None = None
    end_time: time | None = None
    reason: str | None = None
    notes: str | None = None


@router.get("/{doctor_id}")
def get_doctor_schedule_overrides(
    doctor_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get all schedule overrides for a doctor.
    """

    doctor = db.scalar(
        select(Doctor).where(
            Doctor.id == doctor_id
        )
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found.",
        )

    overrides = db.scalars(
        select(DoctorScheduleOverride)
        .where(
            DoctorScheduleOverride.doctor_id == doctor_id
        )
        .order_by(DoctorScheduleOverride.override_date)
    ).all()

    return [
        {
            "id": item.id,
            "override_date": item.override_date,
            "is_working": item.is_working,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "reason": item.reason,
            "notes": item.notes,
        }
        for item in overrides
    ]


@router.post("/{doctor_id}")
def create_doctor_schedule_override(
    doctor_id: UUID,
    data: DoctorScheduleOverrideCreate,
    db: Session = Depends(get_db),
):
    """
    Create a schedule override for a specific date.
    """

    doctor = db.scalar(
        select(Doctor).where(
            Doctor.id == doctor_id
        )
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found.",
        )

    if data.is_working:
        if data.start_time is None or data.end_time is None:
            raise HTTPException(
                status_code=400,
                detail="Start and end times are required when the doctor is working.",
            )

        if data.start_time >= data.end_time:
            raise HTTPException(
                status_code=400,
                detail="Start time must be earlier than end time.",
            )

    else:
        data.start_time = None
        data.end_time = None

    existing = db.scalar(
        select(DoctorScheduleOverride).where(
            DoctorScheduleOverride.doctor_id == doctor_id,
            DoctorScheduleOverride.override_date == data.override_date,
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="An override already exists for this doctor on this date.",
        )

    override = DoctorScheduleOverride(
        organization_id=doctor.organization_id,
        doctor_id=doctor_id,
        override_date=data.override_date,
        is_working=data.is_working,
        start_time=data.start_time,
        end_time=data.end_time,
        reason=data.reason,
        notes=data.notes,
    )

    db.add(override)
    db.commit()
    db.refresh(override)

    return {
        "id": override.id,
        "override_date": override.override_date,
        "is_working": override.is_working,
        "start_time": override.start_time,
        "end_time": override.end_time,
        "reason": override.reason,
        "notes": override.notes,
        "message": "Doctor schedule override created successfully",
    }


@router.delete("/{override_id}")
def delete_doctor_schedule_override(
    override_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a doctor schedule override.
    """

    override = db.scalar(
        select(DoctorScheduleOverride).where(
            DoctorScheduleOverride.id == override_id
        )
    )

    if not override:
        raise HTTPException(
            status_code=404,
            detail="Doctor schedule override not found.",
        )

    db.delete(override)
    db.commit()

    return {
        "message": "Doctor schedule override deleted successfully"
    }