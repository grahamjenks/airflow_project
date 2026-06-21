"""add owner_id to matches

Revision ID: 20260621_0003
Revises: 20260516_0002
Create Date: 2026-06-21

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260621_0003"
down_revision = "20260516_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add the column nullable first so the migration succeeds on tables that
    # already contain rows.
    op.add_column(
        "matches",
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # Backfill any pre-existing matches to the oldest (bootstrap admin) user.
    # No-op when the table is empty.
    op.execute(
        """
        UPDATE matches
        SET owner_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
        WHERE owner_id IS NULL
        """
    )

    op.create_foreign_key(
        "fk_matches_owner_id_users",
        "matches",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_matches_owner_id", "matches", ["owner_id"])
    op.alter_column("matches", "owner_id", nullable=False)


def downgrade() -> None:
    op.drop_index("ix_matches_owner_id", table_name="matches")
    op.drop_constraint("fk_matches_owner_id_users", "matches", type_="foreignkey")
    op.drop_column("matches", "owner_id")
