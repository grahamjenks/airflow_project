"""
Test configuration.

Sets up an SQLite in-memory database before any app modules are imported so
that the PostgreSQL-specific column types (JSONB, UUID) are replaced with
SQLite-compatible equivalents and the engine uses our test database.
"""
from __future__ import annotations

import os
import tempfile

# ── 1. Point the app at a temporary SQLite file ──────────────────────────────
_fd, _db_file = tempfile.mkstemp(suffix=".db", prefix="test_cricket_")
os.close(_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_db_file}"

# Required settings (no defaults in production) plus a permissive rate limit so
# the throttle never interferes with the test suite.
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("ADMIN_PASSWORD", "test-admin-password")
os.environ.setdefault("LOGIN_RATE_LIMIT", "10000/minute")

# ── 2. Patch postgresql-specific types to SQLite-compatible equivalents ───────
#    Must happen BEFORE any `from app.models import ...` so the `from
#    sqlalchemy.dialects.postgresql import JSONB, UUID` in models.py picks up
#    the patched versions.
from sqlalchemy import JSON, types as _sa_types  # noqa: E402

import sqlalchemy.dialects.postgresql as _pg  # noqa: E402


class _SqliteUUID(_sa_types.TypeDecorator):
    """Stores UUIDs as 36-char strings in SQLite."""

    impl = _sa_types.String(36)
    cache_ok = True

    def __init__(self, *args, **kwargs):
        kwargs.pop("as_uuid", None)
        super().__init__(**kwargs)

    def process_bind_param(self, value, dialect):
        return str(value) if value is not None else None

    def process_result_value(self, value, dialect):
        import uuid
        return uuid.UUID(str(value)) if value is not None else None


_pg.JSONB = JSON  # type: ignore[attr-defined]
_pg.UUID = _SqliteUUID  # type: ignore[attr-defined]

# ── 3. Import app after env + type patches are in place ──────────────────────
import atexit  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.db as _app_db  # noqa: E402
from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.security import create_access_token, hash_password  # noqa: E402

# Create tables once for the whole test session.
Base.metadata.create_all(bind=_app_db.engine)


@atexit.register
def _remove_test_db() -> None:
    try:
        os.unlink(_db_file)
    except OSError:
        pass


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture()
def db():
    """Yield a database session; close it after the test."""
    session = _app_db.SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def clean_db(db):
    """Wipe all rows before every test so tests are independent."""
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
    yield


@pytest.fixture()
def client(db):
    """TestClient wired to the test database session."""
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def test_user(db):
    """A persisted test user with known credentials."""
    user = User(username="testuser", password_hash=hash_password("testpass"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def auth_headers(test_user):
    """Bearer token headers for the test user."""
    token = create_access_token(sub=test_user.username)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def other_user(db):
    """A second persisted user, distinct from ``test_user``."""
    user = User(username="otheruser", password_hash=hash_password("otherpass"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def other_auth_headers(other_user):
    """Bearer token headers for the second user."""
    token = create_access_token(sub=other_user.username)
    return {"Authorization": f"Bearer {token}"}
