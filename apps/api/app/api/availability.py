from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.user import User
from app.services.availability_service import AvailabilityService


router = APIRouter(
    prefix="/availability",
    tags=["Availability"],
)


@router.get("/clinic/{organization_id}")
def get_clinic_availability(
    organization_id: UUID,
    requested_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get opening hours only for the authenticated user's clinic."""

    if organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=404,
            detail="Clinic not found",
        )

    return AvailabilityService.get_clinic_hours(
        db=db,
        organization_id=current_user.organization_id,
        requested_date=requested_date,
    )


@router.get("/slots/{doctor_id}")
def get_doctor_availability_slots(
    doctor_id: UUID,
    requested_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get appointment slots for a doctor in the authenticated clinic."""

    doctor = db.scalar(
        select(Doctor).where(
            Doctor.id == doctor_id,
            Doctor.organization_id == current_user.organization_id,
            Doctor.is_active.is_(True),
        )
    )

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    return AvailabilityService.get_available_slots(
        db=db,
        doctor_id=doctor.id,
        requested_date=requested_date,
        slot_duration_minutes=30,
    )