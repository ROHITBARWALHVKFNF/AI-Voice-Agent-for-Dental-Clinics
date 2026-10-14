from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    max_doctors: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    max_staff: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    included_voice_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    included_whatsapp_messages: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    crm_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="basic",
    )

    automation_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="basic",
    )

    analytics_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="basic",
    )

    features: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
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