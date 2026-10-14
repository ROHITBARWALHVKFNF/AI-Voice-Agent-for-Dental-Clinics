from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.follow_up import FollowUp
from app.models.patient import Patient


router = APIRouter(
    prefix="/follow-ups",
    tags=["Follow-ups"],
)


FOLLOW_UP_TYPES = [
    "general",
    "appointment",
    "treatment",
    "payment",
    "recall",
    "post_treatment",
    "missed_appointment",
    "lead",
]

FOLLOW_UP_STATUSES = [
    "pending",
    "completed",
    "cancelled",
]


class FollowUpCreate(BaseModel):
    organization_id: UUID
    patient_id: UUID
    assigned_to_user_id: Optional[UUID] = None
    follow_up_type: str = "general"
    due_at: datetime
    notes: Optional[str] = None


class FollowUpUpdate(BaseModel):
    assigned_to_user_id: Optional[UUID] = None
    follow_up_type: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class FollowUpResponse(BaseModel):
    id: UUID
    organization_id: UUID
    patient_id: UUID
    assigned_to_user_id: Optional[UUID]
    follow_up_type: str
    due_at: datetime
    status: str
    notes: Optional[str]
    completed_at: Optional[datetime]
    patient_name: str


def build_response(
    follow_up: FollowUp,
    patient_name: str,
) -> FollowUpResponse:
    return FollowUpResponse(
        id=follow_up.id,
        organization_id=follow_up.organization_id,
        patient_id=follow_up.patient_id,
        assigned_to_user_id=follow_up.assigned_to_user_id,
        follow_up_type=follow_up.follow_up_type,
        due_at=follow_up.due_at,
        status=follow_up.status,
        notes=follow_up.notes,
        completed_at=follow_up.completed_at,
        patient_name=patient_name,
    )


@router.post(
    "",
    response_model=FollowUpResponse,
)
def create_follow_up(
    data: FollowUpCreate,
    db: Session = Depends(get_db),
):
    patient = db.scalar(
        select(Patient).where(
            Patient.id == data.patient_id,
            Patient.organization_id == data.organization_id,
        )
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    if data.follow_up_type not in FOLLOW_UP_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid follow-up type",
        )

    follow_up = FollowUp(
        organization_id=data.organization_id,
        patient_id=data.patient_id,
        assigned_to_user_id=data.assigned_to_user_id,
        follow_up_type=data.follow_up_type,
        due_at=data.due_at,
        status="pending",
        notes=data.notes,
    )

    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)

    return build_response(
        follow_up,
        patient.full_name,
    )


@router.get(
    "",
    response_model=list[FollowUpResponse],
)
def list_follow_ups(
    organization_id: UUID,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = (
        select(
            FollowUp,
            Patient.full_name,
        )
        .join(
            Patient,
            Patient.id == FollowUp.patient_id,
        )
        .where(
            FollowUp.organization_id == organization_id,
            Patient.is_active.is_(True),
        )
        .order_by(
            FollowUp.due_at.asc()
        )
    )

    if status:
        if status not in FOLLOW_UP_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid follow-up status",
            )

        query = query.where(
            FollowUp.status == status
        )

    rows = db.execute(query).all()

    return [
        build_response(
            follow_up,
            patient_name,
        )
        for follow_up, patient_name in rows
    ]


@router.get(
    "/patient/{patient_id}",
    response_model=list[FollowUpResponse],
)
def patient_follow_ups(
    patient_id: UUID,
    db: Session = Depends(get_db),
):
    patient = db.scalar(
        select(Patient).where(
            Patient.id == patient_id
        )
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    follow_ups = db.scalars(
        select(FollowUp)
        .where(
            FollowUp.patient_id == patient_id
        )
        .order_by(
            FollowUp.due_at.desc()
        )
    ).all()

    return [
        build_response(
            item,
            patient.full_name,
        )
        for item in follow_ups
    ]


@router.patch(
    "/{follow_up_id}",
    response_model=FollowUpResponse,
)
def update_follow_up(
    follow_up_id: UUID,
    data: FollowUpUpdate,
    db: Session = Depends(get_db),
):
    follow_up = db.scalar(
        select(FollowUp).where(
            FollowUp.id == follow_up_id
        )
    )

    if not follow_up:
        raise HTTPException(
            status_code=404,
            detail="Follow-up not found",
        )

    patient = db.scalar(
        select(Patient).where(
            Patient.id == follow_up.patient_id
        )
    )

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found",
        )

    updates = data.model_dump(
        exclude_unset=True
    )

    if (
        "follow_up_type" in updates
        and updates["follow_up_type"] not in FOLLOW_UP_TYPES
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid follow-up type",
        )

    if (
        "status" in updates
        and updates["status"] not in FOLLOW_UP_STATUSES
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid follow-up status",
        )

    for field, value in updates.items():
        setattr(
            follow_up,
            field,
            value,
        )

    if data.status == "completed":
        if follow_up.completed_at is None:
            follow_up.completed_at = datetime.now().astimezone()

    elif data.status is not None:
        follow_up.completed_at = None

    db.commit()
    db.refresh(follow_up)

    return build_response(
        follow_up,
        patient.full_name,
    )


@router.delete(
    "/{follow_up_id}",
)
def delete_follow_up(
    follow_up_id: UUID,
    db: Session = Depends(get_db),
):
    follow_up = db.scalar(
        select(FollowUp).where(
            FollowUp.id == follow_up_id
        )
    )

    if not follow_up:
        raise HTTPException(
            status_code=404,
            detail="Follow-up not found",
        )

    db.delete(follow_up)
    db.commit()

    return {
        "message": "Follow-up deleted successfully"
    }