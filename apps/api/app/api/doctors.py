from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.user import User


router = APIRouter(
    prefix="/doctors",
    tags=["Doctors"],
)


class DoctorCreate(BaseModel):
    full_name: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None


class DoctorResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    organization_id: UUID
    full_name: str
    specialization: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    bio: Optional[str]
    is_active: bool


@router.post(
    "",
    response_model=DoctorResponse,
)
def create_doctor(
    doctor_data: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a doctor inside the authenticated user's organization.

    The organization_id is NEVER accepted from the client.
    It always comes from the authenticated user's JWT/database record.
    """

    organization_id = current_user.organization_id

    doctor = Doctor(
        organization_id=organization_id,
        full_name=doctor_data.full_name,
        specialization=doctor_data.specialization,
        phone=doctor_data.phone,
        email=doctor_data.email,
        bio=doctor_data.bio,
        is_active=True,
    )

    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return doctor


@router.get(
    "",
    response_model=list[DoctorResponse],
)
def list_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return only active doctors belonging to the authenticated user's organization.
    """

    organization_id = current_user.organization_id

    doctors = db.scalars(
        select(Doctor)
        .where(
            Doctor.organization_id == organization_id,
            Doctor.is_active.is_(True),
        )
        .order_by(
            Doctor.full_name.asc()
        )
    ).all()

    return doctors


@router.get(
    "/{doctor_id}",
    response_model=DoctorResponse,
)
def get_doctor(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return a doctor only if that doctor belongs to the authenticated
    user's organization.
    """

    organization_id = current_user.organization_id

    doctor = db.scalar(
        select(Doctor).where(
            Doctor.id == doctor_id,
            Doctor.organization_id == organization_id,
        )
    )

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found",
        )

    return doctor