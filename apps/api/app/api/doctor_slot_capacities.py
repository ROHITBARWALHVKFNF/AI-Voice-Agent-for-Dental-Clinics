
from datetime import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.doctor_slot_capacity import DoctorSlotCapacity

router = APIRouter(
    prefix="/doctor-slot-capacities",
    tags=["Doctor Slot Capacities"],
)


class SlotCapacityUpdate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    slot_start: time
    capacity: int = Field(ge=0, le=100)


@router.get("/{doctor_id}")
def get_slot_capacities(
    doctor_id: UUID,
    db: Session = Depends(get_db),
):
    doctor = db.scalar(
        select(Doctor).where(Doctor.id == doctor_id)
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    rows = db.scalars(
        select(DoctorSlotCapacity)
        .where(
            DoctorSlotCapacity.doctor_id == doctor_id,
            DoctorSlotCapacity.organization_id == doctor.organization_id,
        )
        .order_by(
            DoctorSlotCapacity.day_of_week,
            DoctorSlotCapacity.slot_start,
        )
    ).all()

    return [
        {
            "id": row.id,
            "day_of_week": row.day_of_week,
            "slot_start": row.slot_start.strftime("%H:%M"),
            "capacity": row.capacity,
        }
        for row in rows
    ]


@router.put("/{doctor_id}")
def set_slot_capacity(
    doctor_id: UUID,
    data: SlotCapacityUpdate,
    db: Session = Depends(get_db),
):
    if data.slot_start.minute not in (0, 30):
        raise HTTPException(
            status_code=400,
            detail="Slot start must be on a 30-minute boundary.",
        )

    if data.slot_start.second or data.slot_start.microsecond:
        raise HTTPException(
            status_code=400,
            detail="Slot start must not include seconds or microseconds.",
        )

    doctor = db.scalar(
        select(Doctor).where(Doctor.id == doctor_id)
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    row = db.scalar(
        select(DoctorSlotCapacity).where(
            DoctorSlotCapacity.organization_id == doctor.organization_id,
            DoctorSlotCapacity.doctor_id == doctor_id,
            DoctorSlotCapacity.day_of_week == data.day_of_week,
            DoctorSlotCapacity.slot_start == data.slot_start,
        )
    )

    try:
        if row is None:
            row = DoctorSlotCapacity(
                organization_id=doctor.organization_id,
                doctor_id=doctor_id,
                day_of_week=data.day_of_week,
                slot_start=data.slot_start,
                capacity=data.capacity,
            )
            db.add(row)
        else:
            row.capacity = data.capacity

        db.commit()
        db.refresh(row)

        return {
            "id": row.id,
            "doctor_id": str(doctor_id),
            "day_of_week": row.day_of_week,
            "slot_start": row.slot_start.strftime("%H:%M"),
            "capacity": row.capacity,
            "message": "Slot capacity saved",
        }
    except Exception:
        db.rollback()
        raise
