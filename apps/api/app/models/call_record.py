from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class CallRecord(Base):
    __tablename__ = "call_records"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    organization_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional external identifier from the telephony provider.
    provider_call_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    caller_number: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
    )

    direction: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="inbound",
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="initiated",
        index=True,
    )

    language: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    duration_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    outcome: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    transcript: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    recording_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
