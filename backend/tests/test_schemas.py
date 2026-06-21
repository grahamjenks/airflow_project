from __future__ import annotations

import uuid

import pytest
from pydantic import ValidationError

from app.schemas import (
    LoginRequest,
    MatchCreate,
    MatchOut,
    MatchUpdate,
    RegisterRequest,
    TokenResponse,
)


class TestLoginRequest:
    def test_valid_inputs_parse_correctly(self):
        m = LoginRequest(username="alice", password="secret")
        assert m.username == "alice"
        assert m.password == "secret"

    def test_missing_username_raises_validation_error(self):
        with pytest.raises(ValidationError):
            LoginRequest(password="secret")

    def test_missing_password_raises_validation_error(self):
        with pytest.raises(ValidationError):
            LoginRequest(username="alice")

    def test_empty_body_raises_validation_error(self):
        with pytest.raises(ValidationError):
            LoginRequest()


class TestRegisterRequest:
    def test_valid_inputs_parse_correctly(self):
        m = RegisterRequest(username="bob", password="password1")
        assert m.username == "bob"

    def test_short_password_raises_validation_error(self):
        with pytest.raises(ValidationError):
            RegisterRequest(username="bob", password="short")

    def test_short_username_raises_validation_error(self):
        with pytest.raises(ValidationError):
            RegisterRequest(username="ab", password="password1")


class TestTokenResponse:
    def test_defaults_token_type_to_bearer(self):
        m = TokenResponse(access_token="abc123")
        assert m.token_type == "bearer"

    def test_explicit_token_type_is_respected(self):
        m = TokenResponse(access_token="abc123", token_type="jwt")
        assert m.token_type == "jwt"


class TestMatchCreate:
    def test_all_fields_default_to_empty_collections(self):
        m = MatchCreate()
        assert m.matchData == {}
        assert m.battingStats == []
        assert m.bowlingStats == []
        assert m.deliveries == []
        assert m.scorecardState == {}

    def test_id_defaults_to_none(self):
        m = MatchCreate()
        assert m.id is None

    def test_accepts_uuid_id(self):
        uid = uuid.uuid4()
        m = MatchCreate(id=uid)
        assert m.id == uid

    def test_accepts_string_uuid_coerced(self):
        uid = uuid.uuid4()
        m = MatchCreate(id=str(uid))
        assert m.id == uid

    def test_accepts_nested_match_data(self):
        m = MatchCreate(matchData={"team1": "India", "overs": 20})
        assert m.matchData["team1"] == "India"


class TestMatchUpdate:
    def test_inherits_defaults_from_base(self):
        m = MatchUpdate()
        assert m.matchData == {}
        assert m.battingStats == []


class TestMatchOut:
    def test_id_is_required(self):
        with pytest.raises(ValidationError):
            MatchOut()

    def test_timestamps_default_to_none(self):
        m = MatchOut(id=uuid.uuid4())
        assert m.created_at is None
        assert m.updated_at is None

    def test_round_trips_match_data_through_model_dump(self):
        uid = uuid.uuid4()
        m = MatchOut(id=uid, matchData={"venue": "MCG"})
        data = m.model_dump()
        assert data["id"] == uid
        assert data["matchData"] == {"venue": "MCG"}
