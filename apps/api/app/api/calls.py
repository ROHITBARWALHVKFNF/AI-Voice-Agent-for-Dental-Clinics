
from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.call_record import CallRecord
from app.models.user import User


router = APIRouter(prefix="/calls", tags=["Call History"])


class CallRecordSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider_call_id: Optional[str] = None
    caller_number: Optional[str] = None
    direction: str
    status: str
    language: Optional[str] = None
    duration_seconds: Optional[int] = None
    summary: Optional[str] = None
    outcome: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime


class CallRecordDetail(CallRecordSummary):
    transcript: list = []
    recording_url: Optional[str] = None
    updated_at: datetime


class CallRecordList(BaseModel):
    items: list[CallRecordSummary]
    total: int
    limit: int
    offset: int


@router.get("", response_model=CallRecordList)
def list_calls(
    status_filter: Optional[str] = Query(default=None, alias="status", max_length=50),
    direction: Optional[Literal["inbound", "outbound"]] = None,
    started_from: Optional[datetime] = None,
    started_to: Optional[datetime] = None,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = current_user.organization_id

    if organization_id is None:
        raise HTTPException(
            status_code=403,
            detail="User is not linked to a clinic",
        )

    if started_from and started_to and started_from > started_to:
        raise HTTPException(
            status_code=400,
            detail="started_from must be before started_to",
        )

    filters = [CallRecord.organization_id == organization_id]

    if status_filter:
        filters.append(CallRecord.status == status_filter)

    if direction:
        filters.append(CallRecord.direction == direction)

    if started_from:
        filters.append(CallRecord.started_at >= started_from)

    if started_to:
        filters.append(CallRecord.started_at <= started_to)

    total = db.scalar(
        select(__import__("sqlalchemy").func.count())
        .select_from(CallRecord)
        .where(*filters)
    ) or 0

    statement = (
        select(CallRecord)
        .where(*filters)
        .order_by(CallRecord.started_at.desc().nullslast(), CallRecord.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    records = db.scalars(statement).all()

    return CallRecordList(
        items=records,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{call_id}", response_model=CallRecordDetail)
def get_call(
    call_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = current_user.organization_id

    if organization_id is None:
        raise HTTPException(
            status_code=403,
            detail="User is not linked to a clinic",
        )

    record = db.scalar(
        select(CallRecord).where(
            CallRecord.id == call_id,
            CallRecord.organization_id == organization_id,
        )
    )

    if record is None:
        raise HTTPException(status_code=404, detail="Call record not found")

    return record
