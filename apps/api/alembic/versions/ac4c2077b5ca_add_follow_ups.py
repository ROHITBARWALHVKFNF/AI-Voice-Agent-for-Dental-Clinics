"""add follow ups

Revision ID: ac4c2077b5ca
Revises: a5a2d250e052
Create Date: 2026-10-08 03:21:47.264780

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "ac4c2077b5ca"
down_revision: Union[str, Sequence[str], None] = "crm_patient_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "follow_ups",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "assigned_to_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "follow_up_type",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "due_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
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
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_follow_ups_organization_id",
        "follow_ups",
        ["organization_id"],
        unique=False,
    )

    op.create_index(
        "ix_follow_ups_patient_id",
        "follow_ups",
        ["patient_id"],
        unique=False,
    )

    op.create_index(
        "ix_follow_ups_assigned_to_user_id",
        "follow_ups",
        ["assigned_to_user_id"],
        unique=False,
    )

    op.create_index(
        "ix_follow_ups_due_at",
        "follow_ups",
        ["due_at"],
        unique=False,
    )

    op.create_index(
        "ix_follow_ups_status",
        "follow_ups",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        "ix_follow_ups_status",
        table_name="follow_ups",
    )

    op.drop_index(
        "ix_follow_ups_due_at",
        table_name="follow_ups",
    )

    op.drop_index(
        "ix_follow_ups_assigned_to_user_id",
        table_name="follow_ups",
    )

    op.drop_index(
        "ix_follow_ups_patient_id",
        table_name="follow_ups",
    )

    op.drop_index(
        "ix_follow_ups_organization_id",
        table_name="follow_ups",
    )

    op.drop_table("follow_ups")