from datetime import date, time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.clinic_schedule_override import ClinicScheduleOverride


router = APIRouter(
    prefix="/schedule-overrides",
    tags=["Schedule Overrides"],
)


class ScheduleOverrideCreate(BaseModel):
    override_date: date
    is_closed: bool = True
    open_time: time | None = None
    close_time: time | None = None
    reason: str | None = None
    notes: str | None = None


@router.get("/{organization_id}")
def get_schedule_overrides(
    organization_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get all temporary schedule overrides for a clinic.
    """

    overrides = db.scalars(
        select(ClinicScheduleOverride)
        .where(
            ClinicScheduleOverride.organization_id == organization_id
        )
        .order_by(ClinicScheduleOverride.override_date)
    ).all()

    return [
        {
            "id": item.id,
            "override_date": item.override_date,
            "is_closed": item.is_closed,
            "open_time": item.open_time,
            "close_time": item.close_time,
            "reason": item.reason,
            "notes": item.notes,
        }
        for item in overrides
    ]


@router.post("/{organization_id}")
def create_schedule_override(
    organization_id: UUID,
    data: ScheduleOverrideCreate,
    db: Session = Depends(get_db),
):
    """
    Create a temporary clinic schedule override.
    """

    if not data.is_closed:
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

    existing = db.scalar(
        select(ClinicScheduleOverride).where(
            ClinicScheduleOverride.organization_id == organization_id,
            ClinicScheduleOverride.override_date == data.override_date,
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="An override already exists for this date.",
        )

    override = ClinicScheduleOverride(
        organization_id=organization_id,
        override_date=data.override_date,
        is_closed=data.is_closed,
        open_time=data.open_time,
        close_time=data.close_time,
        reason=data.reason,
        notes=data.notes,
    )

    db.add(override)
    db.commit()
    db.refresh(override)

    return {
        "id": override.id,
        "override_date": override.override_date,
        "is_closed": override.is_closed,
        "open_time": override.open_time,
        "close_time": override.close_time,
        "reason": override.reason,
        "notes": override.notes,
        "message": "Schedule override created successfully",
    }


@router.delete("/{override_id}")
def delete_schedule_override(
    override_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a temporary schedule override.
    """

    override = db.scalar(
        select(ClinicScheduleOverride).where(
            ClinicScheduleOverride.id == override_id
        )
    )

    if not override:
        raise HTTPException(
            status_code=404,
            detail="Schedule override not found.",
        )

    db.delete(override)
    db.commit()

    return {
        "message": "Schedule override deleted successfully"
    }