
from datetime import time
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Index,
    Integer,
    SmallInteger,
    Time,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class DoctorSlotCapacity(Base):
    __tablename__ = "doctor_slot_capacities"

    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "day_of_week",
            "slot_start",
            name="uq_doctor_slot_capacity_weekday_start",
        ),
        CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_doctor_slot_capacity_weekday",
        ),
        CheckConstraint(
            "capacity >= 0 AND capacity <= 100",
            name="ck_doctor_slot_capacity_range",
        ),
        Index(
            "ix_doctor_slot_capacity_org_doctor",
            "organization_id",
            "doctor_id",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )

    doctor_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )

    day_of_week: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
    )

    slot_start: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )

    capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
