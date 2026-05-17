"""add deliveries and scorecard_state to matches

Revision ID: 20260516_0002
Revises: 20260228_0001
Create Date: 2026-05-16

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260516_0002"
down_revision = "20260228_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "matches",
        sa.Column(
            "deliveries",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "matches",
        sa.Column(
            "scorecard_state",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("matches", "scorecard_state")
    op.drop_column("matches", "deliveries")
