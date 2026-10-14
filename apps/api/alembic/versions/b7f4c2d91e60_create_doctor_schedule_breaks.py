
"""create recurring doctor schedule breaks

Revision ID: b7f4c2d91e60
Revises: 1c6d78f46a09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7f4c2d91e60"
down_revision: Union[str, Sequence[str], None] = "1c6d78f46a09"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "doctor_schedule_breaks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("doctor_id", sa.UUID(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column(
            "reason",
            sa.String(length=100),
            nullable=False,
            server_default="Break",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_doctor_schedule_break_day_of_week",
        ),
        sa.CheckConstraint(
            "start_time < end_time",
            name="ck_doctor_schedule_break_time_range",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["doctor_id"],
            ["doctors.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "doctor_id",
            "day_of_week",
            "start_time",
            "end_time",
            name="uq_doctor_schedule_break_time",
        ),
    )

    op.create_index(
        "ix_doctor_schedule_breaks_organization_id",
        "doctor_schedule_breaks",
        ["organization_id"],
    )

    op.create_index(
        "ix_doctor_schedule_breaks_doctor_id",
        "doctor_schedule_breaks",
        ["doctor_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_doctor_schedule_breaks_doctor_id",
        table_name="doctor_schedule_breaks",
    )

    op.drop_index(
        "ix_doctor_schedule_breaks_organization_id",
        table_name="doctor_schedule_breaks",
    )

    op.drop_table("doctor_schedule_breaks")
