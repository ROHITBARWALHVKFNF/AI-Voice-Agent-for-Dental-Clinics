
from datetime import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.doctor_schedule import DoctorSchedule
from app.models.doctor_schedule_break import DoctorScheduleBreak
from app.models.user import User


router = APIRouter(
    prefix="/doctor-schedule-breaks",
    tags=["Doctor Schedule Breaks"],
)


class BreakPayload(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    reason: str = Field(default="Break", min_length=1, max_length=100)


def get_doctor(doctor_id: UUID, user: User, db: Session) -> Doctor:
    doctor = db.scalar(
        select(Doctor).where(
            Doctor.id == doctor_id,
            Doctor.organization_id == user.organization_id,
        )
    )
    if not doctor:
        raise HTTPException(404, "Doctor not found in your organization.")
    return doctor


def get_break_or_404(
    break_id: UUID, user: User, db: Session
) -> DoctorScheduleBreak:
    item = db.scalar(
        select(DoctorScheduleBreak).where(
            DoctorScheduleBreak.id == break_id,
            DoctorScheduleBreak.organization_id == user.organization_id,
        )
    )
    if not item:
        raise HTTPException(404, "Break not found.")
    return item


def validate_break(
    doctor: Doctor,
    data: BreakPayload,
    db: Session,
    exclude_id: UUID | None = None,
) -> None:
    if data.start_time >= data.end_time:
        raise HTTPException(400, "Break start time must be before end time.")

    schedule = db.scalar(
        select(DoctorSchedule).where(
            DoctorSchedule.doctor_id == doctor.id,
            DoctorSchedule.organization_id == doctor.organization_id,
            DoctorSchedule.day_of_week == data.day_of_week,
        )
    )

    if (
        not schedule
        or not schedule.is_working
        or schedule.start_time is None
        or schedule.end_time is None
    ):
        raise HTTPException(
            400,
            "Set working hours for this weekday before adding a break.",
        )

    if (
        data.start_time < schedule.start_time
        or data.end_time > schedule.end_time
    ):
        raise HTTPException(
            400, "The break must be within the doctor's working hours."
        )

    query = select(DoctorScheduleBreak).where(
        DoctorScheduleBreak.doctor_id == doctor.id,
        DoctorScheduleBreak.organization_id == doctor.organization_id,
        DoctorScheduleBreak.day_of_week == data.day_of_week,
        DoctorScheduleBreak.start_time < data.end_time,
        DoctorScheduleBreak.end_time > data.start_time,
    )

    if exclude_id is not None:
        query = query.where(DoctorScheduleBreak.id != exclude_id)

    if db.scalar(query):
        raise HTTPException(
            409, "This break overlaps another break on that weekday."
        )


def serialize(item: DoctorScheduleBreak) -> dict:
    return {
        "id": str(item.id),
        "doctor_id": str(item.doctor_id),
        "day_of_week": item.day_of_week,
        "start_time": item.start_time.strftime("%H:%M:%S"),
        "end_time": item.end_time.strftime("%H:%M:%S"),
        "reason": item.reason,
    }


@router.get("/{doctor_id}")
def list_breaks(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_doctor(doctor_id, user, db)

    items = db.scalars(
        select(DoctorScheduleBreak)
        .where(
            DoctorScheduleBreak.doctor_id == doctor_id,
            DoctorScheduleBreak.organization_id == user.organization_id,
        )
        .order_by(
            DoctorScheduleBreak.day_of_week,
            DoctorScheduleBreak.start_time,
        )
    ).all()

    return [serialize(item) for item in items]


@router.post("/{doctor_id}", status_code=status.HTTP_201_CREATED)
def create_break(
    doctor_id: UUID,
    data: BreakPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doctor = get_doctor(doctor_id, user, db)
    validate_break(doctor, data, db)

    item = DoctorScheduleBreak(
        organization_id=doctor.organization_id,
        doctor_id=doctor.id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        reason=data.reason.strip(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {**serialize(item), "message": "Recurring break created."}


@router.put("/{break_id}")
def update_break(
    break_id: UUID,
    data: BreakPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = get_break_or_404(break_id, user, db)
    doctor = get_doctor(item.doctor_id, user, db)
    validate_break(doctor, data, db, exclude_id=item.id)

    item.day_of_week = data.day_of_week
    item.start_time = data.start_time
    item.end_time = data.end_time
    item.reason = data.reason.strip()

    db.commit()
    db.refresh(item)
    return {**serialize(item), "message": "Recurring break updated."}


@router.delete("/{break_id}")
def delete_break(
    break_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = get_break_or_404(break_id, user, db)
    db.delete(item)
    db.commit()
    return {"message": "Recurring break deleted."}
