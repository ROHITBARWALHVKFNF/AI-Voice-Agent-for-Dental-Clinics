from datetime import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.doctor_schedule import DoctorSchedule
from app.models.user import User


router = APIRouter(
    prefix="/doctor-schedules",
    tags=["Doctor Schedules"],
)


class DoctorScheduleUpdate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    is_working: bool
    start_time: time | None = None
    end_time: time | None = None
    slot_capacity: int = Field(default=6, ge=1, le=100)


class WeekDay(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    is_working: bool
    start_time: time | None = None
    end_time: time | None = None
    slot_capacity: int = Field(default=1, ge=1, le=100)


class WeeklyScheduleUpdate(BaseModel):
    days: list[WeekDay]


def _get_doctor_in_clinic(
    db: Session,
    doctor_id: UUID,
    current_user: User,
) -> Doctor:
    doctor = db.scalar(
        select(Doctor).where(
            Doctor.id == doctor_id,
            Doctor.organization_id == current_user.organization_id,
        )
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found.",
        )

    return doctor


@router.get("/{doctor_id}")
def get_doctor_schedule(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the weekly working schedule for a doctor.
    """

    _get_doctor_in_clinic(db, doctor_id, current_user)

    schedules = db.scalars(
        select(DoctorSchedule)
        .where(DoctorSchedule.doctor_id == doctor_id)
        .order_by(DoctorSchedule.day_of_week)
    ).all()

    return [
        {
            "id": item.id,
            "day_of_week": item.day_of_week,
            "is_working": item.is_working,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "slot_capacity": item.slot_capacity,
        }
        for item in schedules
    ]


@router.put("/{doctor_id}/week")
def update_weekly_schedule(
    doctor_id: UUID,
    data: WeeklyScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save the doctor's whole weekly schedule in one transaction.
    """

    doctor = _get_doctor_in_clinic(db, doctor_id, current_user)

    seen: set[int] = set()

    for day in data.days:
        if day.day_of_week in seen:
            raise HTTPException(
                status_code=400,
                detail="Duplicate day in schedule.",
            )

        seen.add(day.day_of_week)

        if day.is_working and (
            day.start_time is None
            or day.end_time is None
            or day.start_time >= day.end_time
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Working days need a start time "
                    "earlier than the end time."
                ),
            )

    existing = {
        row.day_of_week: row
        for row in db.scalars(
            select(DoctorSchedule).where(
                DoctorSchedule.doctor_id == doctor_id
            )
        ).all()
    }

    for day in data.days:
        row = existing.get(day.day_of_week)

        if row is None:
            row = DoctorSchedule(
                organization_id=doctor.organization_id,
                doctor_id=doctor_id,
                day_of_week=day.day_of_week,
            )
            db.add(row)

        row.is_working = day.is_working
        row.start_time = day.start_time if day.is_working else None
        row.end_time = day.end_time if day.is_working else None
        row.slot_capacity = day.slot_capacity

    db.commit()

    return {
        "message": "Weekly schedule saved",
        "days_saved": len(data.days),
    }


@router.put("/{doctor_id}")
def update_doctor_schedule(
    doctor_id: UUID,
    data: DoctorScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the doctor's working hours and slot capacity for one day.
    """

    doctor = _get_doctor_in_clinic(db, doctor_id, current_user)

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

    schedule = db.scalar(
        select(DoctorSchedule).where(
            DoctorSchedule.doctor_id == doctor_id,
            DoctorSchedule.day_of_week == data.day_of_week,
        )
    )

    if not schedule:
        schedule = DoctorSchedule(
            organization_id=doctor.organization_id,
            doctor_id=doctor_id,
            day_of_week=data.day_of_week,
        )

        db.add(schedule)

    schedule.is_working = data.is_working
    schedule.start_time = data.start_time
    schedule.end_time = data.end_time
    schedule.slot_capacity = data.slot_capacity

    db.commit()
    db.refresh(schedule)

    return {
        "id": schedule.id,
        "day_of_week": schedule.day_of_week,
        "is_working": schedule.is_working,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
        "slot_capacity": schedule.slot_capacity,
        "message": "Doctor schedule updated successfully",
    }