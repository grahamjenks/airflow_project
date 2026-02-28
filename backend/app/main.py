from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import configure_logging, log_event
from app.db import SessionLocal
from app.models import User
from app.routes.auth import router as auth_router
from app.routes.matches import router as matches_router
from app.security import hash_password


configure_logging()
logger = logging.getLogger("cricket_api")


def parse_cors_origins(raw: str) -> list[str]:
    return [o.strip() for o in (raw or "").split(",") if o.strip()]


app = FastAPI(title="Cricket API", version=settings.app_version or "0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def request_context_and_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    start = time.time()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        duration_ms = int((time.time() - start) * 1000)
        status_code = getattr(response, "status_code", None)
        log_event(
            logger,
            "http_request",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=status_code,
            duration_ms=duration_ms,
        )
        if response is not None:
            response.headers["X-Request-ID"] = request_id


@app.on_event("startup")
def bootstrap_admin():
    # Ensure the admin user exists (env-driven bootstrap).
    with SessionLocal() as db:
        existing = db.query(User).filter(User.username == settings.admin_username).one_or_none()
        if existing:
            return
        user = User(username=settings.admin_username, password_hash=hash_password(settings.admin_password))
        db.add(user)
        db.commit()
        log_event(logger, "admin_bootstrapped", username=settings.admin_username)


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/readyz")
def readyz(response: Response):
    try:
        with SessionLocal() as db:  # type: Session
            db.execute(text("SELECT 1"))
        return {"ok": True}
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"ok": False}


app.include_router(auth_router)
app.include_router(matches_router)

