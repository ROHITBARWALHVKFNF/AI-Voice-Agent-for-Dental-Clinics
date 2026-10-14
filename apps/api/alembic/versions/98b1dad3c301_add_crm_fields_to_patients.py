"""add crm fields to patients

Revision ID: crm_patient_fields
Revises: cea29b83574a
"""

from alembic import op
import sqlalchemy as sa


revision = "crm_patient_fields"

down_revision = "cea29b83574a"

branch_labels = None

depends_on = None


def upgrade() -> None:
    op.add_column(
        "patients",
        sa.Column(
            "lead_stage",
            sa.String(length=50),
            nullable=False,
            server_default="new_lead",
        ),
    )

    op.add_column(
        "patients",
        sa.Column(
            "lead_source",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "patients",
        sa.Column(
            "next_follow_up_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_patients_lead_stage",
        "patients",
        ["lead_stage"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_patients_lead_stage",
        table_name="patients",
    )

    op.drop_column(
        "patients",
        "next_follow_up_at",
    )

    op.drop_column(
        "patients",
        "lead_source",
    )

    op.drop_column(
        "patients",
        "lead_stage",
    )