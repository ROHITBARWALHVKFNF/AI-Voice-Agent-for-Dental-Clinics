from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.user import User


router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
)


CRM_STAGES = [
    "new_lead",
    "contacted",
    "appointment_booked",
    "visited",
    "treatment_planned",
    "treatment_started",
    "treatment_completed",
    "follow_up",
    "recall",
]


class PatientCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    lead_stage: str = "new_lead"
    lead_source: Optional[str] = None
    next_follow_up_at: Optional[datetime] = None


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    lead_stage: Optional[str] = None
    lead_source: Optional[str] = None
    next_follow_up_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    organization_id: UUID
    full_name: str
    phone: Optional[str]
    email: Optional[str]
    date_of_birth: Optional[datetime]
    gender: Optional[str]
    address: Optional[str]
    notes: Optional[str]
    lead_stage: str
    lead_source: Optional[str]
    next_follow_up_at: Optional[datetime]
    is_active: bool


class PatientAppointmentResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    doctor_name: str
    start_time: datetime
    end_time: datetime
    status: str
    appointment_type: Optional[str]
    notes: Optional[str]
    cancellation_reason: Optional[str]


@router.post(
    "",
    response_model=PatientResponse,
)
def create_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a patient inside the authenticated user's organization.

    organization_id is never accepted from the client.
    """

    organization_id = current_user.organization_id

    if patient_data.lead_stage not in CRM_STAGES:
        raise HTTPException(
            status_code=400,
            detail="Invalid CRM lead stage",
        )

    patient = Patient(
        organization_id=organization_id,
        full_name=patient_data.full_name,
        phone=patient_data.phone,
        email=patient_data.email,
        date_of_birth=patient_data.date_of_birth,
        gender=patient_data.gender,
        address=patient_data.address,
        notes=patient_data.notes,
        lead_stage=patient_data.lead_stage,
        lead_source=patient_data.lead_source,
        next_follow_up_at=patient_data.next_follow_up_at,
        is_active=True,
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    return patient


@router.get(
    "",
    response_model=list[PatientResponse],
)
def list_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return only active patients belonging to the authenticated user's organization.
    """

    organization_id = current_user.organization_id

    patients = db.scalars(
        select(Patient)
        .where(
            Patient.organization_id == organization_id,
            Patient.is_active.is_(True),
        )
        .order_by(
            Patient.full_name.asc()
        )
    ).all()

    return patients


@router.get(
    "/{patient_id}",
    response_model=PatientResponse,
)
def get_patient(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return a patient only if that patient belongs to the authenticated
    user's organization.
    """

    organization_id = current_user.organization_id

    patient = db.scalar(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.organization_id == organization_id,
        )
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    return patient


@router.patch(
    "/{patient_id}",
    response_model=PatientResponse,
)
def update_patient(
    patient_id: UUID,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a patient only if the patient belongs to the authenticated
    user's organization.
    """

    organization_id = current_user.organization_id

    patient = db.scalar(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.organization_id == organization_id,
        )
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    update_data = patient_data.model_dump(
        exclude_unset=True
    )

    if (
        "lead_stage" in update_data
        and update_data["lead_stage"] not in CRM_STAGES
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid CRM lead stage",
        )

    for field, value in update_data.items():
        setattr(
            patient,
            field,
            value,
        )

    db.commit()
    db.refresh(patient)

    return patient


@router.delete(
    "/{patient_id}",
)
def deactivate_patient(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deactivate a patient only if the patient belongs to the authenticated
    user's organization.
    """

    organization_id = current_user.organization_id

    patient = db.scalar(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.organization_id == organization_id,
        )
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    patient.is_active = False

    db.commit()

    return {
        "message": "Patient deactivated successfully"
    }


@router.get(
    "/{patient_id}/appointments",
    response_model=list[PatientAppointmentResponse],
)
def patient_appointments(
    patient_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return appointment history only for a patient belonging to the
    authenticated user's organization.
    """

    organization_id = current_user.organization_id

    patient = db.scalar(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.organization_id == organization_id,
        )
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    rows = db.execute(
        select(
            Appointment,
            Doctor.full_name,
        )
        .join(
            Doctor,
            Doctor.id == Appointment.doctor_id,
        )
        .where(
            Appointment.patient_id == patient_id,
            Appointment.organization_id == organization_id,
            Doctor.organization_id == organization_id,
        )
        .order_by(
            Appointment.start_time.desc()
        )
    ).all()

    return [
        PatientAppointmentResponse(
            id=appointment.id,
            doctor_id=appointment.doctor_id,
            doctor_name=doctor_name,
            start_time=appointment.start_time,
            end_time=appointment.end_time,
            status=appointment.status,
            appointment_type=appointment.appointment_type,
            notes=appointment.notes,
            cancellation_reason=appointment.cancellation_reason,
        )
        for appointment, doctor_name in rows
    ]