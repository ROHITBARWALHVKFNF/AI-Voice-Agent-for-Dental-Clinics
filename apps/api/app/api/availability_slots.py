from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.availability_service import AvailabilityService


router = APIRouter(
    prefix="/availability-slots",
    tags=["Availability Slots"],
)


@router.get("/{doctor_id}")
def get_available_slots(
    doctor_id: UUID,
    requested_date: date = Query(..., description="Date in YYYY-MM-DD format"),
    slot_duration_minutes: int = Query(
        30,
        ge=15,
        le=120,
        description="Appointment slot duration in minutes",
    ),
    db: Session = Depends(get_db),
):
    """
    Get available appointment slots for a doctor on a specific date.
    """

    result = AvailabilityService.get_available_slots(
        db=db,
        doctor_id=doctor_id,
        requested_date=requested_date,
        slot_duration_minutes=slot_duration_minutes,
    )

    return {
        "doctor_id": doctor_id,
        "date": requested_date,
        "slot_duration_minutes": slot_duration_minutes,
        **result,
    }