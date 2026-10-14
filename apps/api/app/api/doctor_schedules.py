from datetime import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.doctor_schedule import DoctorSchedule


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


@router.get("/{doctor_id}")
def get_doctor_schedule(
    doctor_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get the weekly working schedule for a doctor.
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

    schedules = db.scalars(
        select(DoctorSchedule)
        .where(
            DoctorSchedule.doctor_id == doctor_id
        )
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


@router.put("/{doctor_id}")
def update_doctor_schedule(
    doctor_id: UUID,
    data: DoctorScheduleUpdate,
    db: Session = Depends(get_db),
):
    """
    Update the doctor's working hours and slot capacity for one day.
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