"""Create doctor slot capacities table."""

from alembic import op
import sqlalchemy as sa

revision = "d4e8f1a92c60"
down_revision = "b7f4c2d91e60"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "doctor_slot_capacities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("doctor_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=False),
        sa.Column("slot_start", sa.Time(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.UniqueConstraint(
            "doctor_id",
            "day_of_week",
            "slot_start",
            name="uq_doctor_slot_capacity_weekday_start",
        ),
        sa.CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_doctor_slot_capacity_weekday",
        ),
        sa.CheckConstraint(
            "capacity >= 0 AND capacity <= 100",
            name="ck_doctor_slot_capacity_range",
        ),
    )

    op.create_index(
        "ix_doctor_slot_capacity_org_doctor",
        "doctor_slot_capacities",
        ["organization_id", "doctor_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_doctor_slot_capacity_org_doctor",
        table_name="doctor_slot_capacities",
    )
    op.drop_table("doctor_slot_capacities")
