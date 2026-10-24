
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
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
    experience_years: Optional[int] = Field(default=None, ge=0, le=80)
    education: Optional[str] = None


class DoctorUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    education: Optional[str] = None
    is_active: Optional[bool] = None


class DoctorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    full_name: str
    specialization: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    bio: Optional[str]
    is_active: bool
    experience_years: Optional[int]
    education: Optional[str]


@router.post(
    "",
    response_model=DoctorResponse,
)
def create_doctor(
    doctor_data: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    organization_id = current_user.organization_id

    doctors = db.scalars(
        select(Doctor)
        .where(
            Doctor.organization_id == organization_id,
            Doctor.is_active.is_(True),
        )
        .order_by(Doctor.full_name.asc())
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


@router.patch(
    "/{doctor_id}",
    response_model=DoctorResponse,
)
def update_doctor(
    doctor_id: UUID,
    doctor_data: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update editable doctor fields within the authenticated user's organization.
    Only fields included in the request are changed.
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

    changes = doctor_data.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update",
        )

    if "full_name" in changes:
        name = changes["full_name"]

        if name is None or not name.strip():
            raise HTTPException(
                status_code=422,
                detail="Doctor name cannot be empty",
            )

        changes["full_name"] = name.strip()

    for field, value in changes.items():
        setattr(doctor, field, value)

    db.commit()
    db.refresh(doctor)

    return doctor
