"""create treatment management tables

Revision ID: YOUR_GENERATED_REVISION
Revises: ac4c2077b5ca
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d7e8f91a23ab"
down_revision: Union[str, Sequence[str], None] = "ac4c2077b5ca"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "treatments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_price", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "estimated_duration_minutes",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_treatments_organization_id",
        "treatments",
        ["organization_id"],
    )

    op.create_table(
        "treatment_plans",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "doctor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("doctors.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default="planned",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("estimated_total", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_treatment_plans_organization_id",
        "treatment_plans",
        ["organization_id"],
    )

    op.create_index(
        "ix_treatment_plans_patient_id",
        "treatment_plans",
        ["patient_id"],
    )

    op.create_index(
        "ix_treatment_plans_doctor_id",
        "treatment_plans",
        ["doctor_id"],
    )

    op.create_index(
        "ix_treatment_plans_status",
        "treatment_plans",
        ["status"],
    )

    op.create_table(
        "patient_treatments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "treatment_plan_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("treatment_plans.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "treatment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("treatments.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "doctor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("doctors.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default="planned",
        ),
        sa.Column("price", sa.Numeric(12, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_patient_treatments_organization_id",
        "patient_treatments",
        ["organization_id"],
    )

    op.create_index(
        "ix_patient_treatments_patient_id",
        "patient_treatments",
        ["patient_id"],
    )

    op.create_index(
        "ix_patient_treatments_treatment_plan_id",
        "patient_treatments",
        ["treatment_plan_id"],
    )

    op.create_index(
        "ix_patient_treatments_treatment_id",
        "patient_treatments",
        ["treatment_id"],
    )

    op.create_index(
        "ix_patient_treatments_doctor_id",
        "patient_treatments",
        ["doctor_id"],
    )

    op.create_index(
        "ix_patient_treatments_status",
        "patient_treatments",
        ["status"],
    )


def downgrade() -> None:
    op.drop_table("patient_treatments")
    op.drop_table("treatment_plans")
    op.drop_table("treatments")