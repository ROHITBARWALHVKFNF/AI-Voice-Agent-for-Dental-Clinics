"""add treatment catalog configuration

Revision ID: 92a9988c4739
Revises: d7e8f91a23ab
Create Date: 2026-10-08
"""

from alembic import op
import sqlalchemy as sa


revision = "92a9988c4739"
down_revision = "d7e8f91a23ab"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "treatments",
        sa.Column(
            "treatment_code",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "treatments",
        sa.Column(
            "tax_percent",
            sa.Numeric(5, 2),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_treatments_treatment_code",
        "treatments",
        ["treatment_code"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_treatments_treatment_code",
        table_name="treatments",
    )

    op.drop_column(
        "treatments",
        "tax_percent",
    )

    op.drop_column(
        "treatments",
        "treatment_code",
    )