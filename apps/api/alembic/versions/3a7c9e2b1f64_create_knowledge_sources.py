
"""Create organization-scoped knowledge sources."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "3a7c9e2b1f64"
down_revision = "91465053927b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "knowledge_sources",
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
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column(
            "category",
            sa.String(length=100),
            nullable=False,
            server_default="General information",
        ),
        sa.Column(
            "source_type",
            sa.String(length=30),
            nullable=False,
            server_default="text",
        ),
        sa.Column(
            "content",
            sa.Text(),
            nullable=False,
            server_default="",
        ),
        sa.Column("source_url", sa.String(length=2048), nullable=True),
        sa.Column(
            "original_filename",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column("mime_type", sa.String(length=150), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="needs_review",
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
            ["created_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_knowledge_sources_organization_id",
        "knowledge_sources",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_knowledge_sources_organization_id",
        table_name="knowledge_sources",
    )
    op.drop_table("knowledge_sources")
