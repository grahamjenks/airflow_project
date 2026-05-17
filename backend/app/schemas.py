from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str


class MatchBase(BaseModel):
    matchData: dict = Field(default_factory=dict)
    battingStats: list = Field(default_factory=list)
    bowlingStats: list = Field(default_factory=list)
    deliveries: list = Field(default_factory=list)
    scorecardState: dict = Field(default_factory=dict)


class MatchCreate(MatchBase):
    id: UUID | None = None


class MatchUpdate(MatchBase):
    pass


class MatchOut(MatchBase):
    id: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

