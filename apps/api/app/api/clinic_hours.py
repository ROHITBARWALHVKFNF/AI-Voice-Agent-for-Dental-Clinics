from datetime import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.clinic_hours import ClinicHours


router = APIRouter(
    prefix="/clinic-hours",
    tags=["Clinic Hours"],
)


class ClinicHoursUpdate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    is_open: bool
    open_time: time | None = None
    close_time: time | None = None


@router.get("/{organization_id}")
def get_clinic_hours(
    organization_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get the regular weekly clinic schedule.
    """

    hours = db.scalars(
        select(ClinicHours)
        .where(
            ClinicHours.organization_id == organization_id
        )
        .order_by(ClinicHours.day_of_week)
    ).all()

    return [
        {
            "id": item.id,
            "day_of_week": item.day_of_week,
            "is_open": item.is_open,
            "open_time": item.open_time,
            "close_time": item.close_time,
        }
        for item in hours
    ]


@router.put("/{organization_id}")
def update_clinic_hours(
    organization_id: UUID,
    data: ClinicHoursUpdate,
    db: Session = Depends(get_db),
):
    """
    Update the regular clinic hours for one day.
    """

    if data.is_open:
        if data.open_time is None or data.close_time is None:
            raise HTTPException(
                status_code=400,
                detail="Open and close times are required when the clinic is open.",
            )

        if data.open_time >= data.close_time:
            raise HTTPException(
                status_code=400,
                detail="Open time must be earlier than close time.",
            )

    else:
        data.open_time = None
        data.close_time = None

    clinic_hours = db.scalar(
        select(ClinicHours).where(
            ClinicHours.organization_id == organization_id,
            ClinicHours.day_of_week == data.day_of_week,
        )
    )

    if not clinic_hours:
        clinic_hours = ClinicHours(
            organization_id=organization_id,
            day_of_week=data.day_of_week,
        )
        db.add(clinic_hours)

    clinic_hours.is_open = data.is_open
    clinic_hours.open_time = data.open_time
    clinic_hours.close_time = data.close_time

    db.commit()
    db.refresh(clinic_hours)

    return {
        "id": clinic_hours.id,
        "day_of_week": clinic_hours.day_of_week,
        "is_open": clinic_hours.is_open,
        "open_time": clinic_hours.open_time,
        "close_time": clinic_hours.close_time,
        "message": "Clinic hours updated successfully",
    }