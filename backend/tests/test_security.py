from __future__ import annotations

import time

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.config import settings
from app.security import (
    create_access_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        assert hash_password("secret") != "secret"

    def test_verify_correct_password(self):
        h = hash_password("secret")
        assert verify_password("secret", h) is True

    def test_verify_wrong_password(self):
        h = hash_password("secret")
        assert verify_password("wrong", h) is False

    def test_two_hashes_differ_due_to_salt(self):
        h1 = hash_password("secret")
        h2 = hash_password("secret")
        assert h1 != h2

    def test_empty_string_can_be_hashed_and_verified(self):
        h = hash_password("")
        assert verify_password("", h) is True
        assert verify_password("notempty", h) is False


class TestCreateAccessToken:
    def test_returns_string(self):
        token = create_access_token(sub="alice")
        assert isinstance(token, str)

    def test_sub_claim_matches(self):
        token = create_access_token(sub="alice")
        assert decode_token(token)["sub"] == "alice"

    def test_iss_claim_matches_settings(self):
        token = create_access_token(sub="alice")
        assert decode_token(token)["iss"] == settings.jwt_issuer

    def test_aud_claim_matches_settings(self):
        token = create_access_token(sub="alice")
        assert decode_token(token)["aud"] == settings.jwt_audience

    def test_token_not_yet_expired(self):
        token = create_access_token(sub="alice")
        assert decode_token(token)["exp"] > int(time.time())

    def test_different_subs_produce_different_tokens(self):
        assert create_access_token(sub="alice") != create_access_token(sub="bob")


class TestDecodeToken:
    def test_tampered_signature_raises_jwt_error(self):
        token = create_access_token(sub="alice")
        tampered = token[:-5] + "xxxxx"
        with pytest.raises(JWTError):
            decode_token(tampered)

    def test_wrong_secret_raises_jwt_error(self):
        payload = {
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "sub": "alice",
            "exp": int(time.time()) + 3600,
        }
        bad_token = jwt.encode(payload, "wrong-secret", algorithm="HS256")
        with pytest.raises(JWTError):
            decode_token(bad_token)

    def test_wrong_audience_raises_jwt_error(self):
        payload = {
            "iss": settings.jwt_issuer,
            "aud": "wrong-audience",
            "sub": "alice",
            "exp": int(time.time()) + 3600,
        }
        bad_token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
        with pytest.raises(JWTError):
            decode_token(bad_token)

    def test_expired_token_raises_jwt_error(self):
        payload = {
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "sub": "alice",
            "exp": int(time.time()) - 1,
        }
        expired_token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
        with pytest.raises(JWTError):
            decode_token(expired_token)


class TestGetCurrentUser:
    def test_valid_token_returns_correct_user(self, db, test_user):
        creds = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=create_access_token(sub=test_user.username),
        )
        user = get_current_user(creds=creds, db=db)
        assert user.username == test_user.username

    def test_invalid_token_raises_401(self, db):
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="not-a-token")
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(creds=creds, db=db)
        assert exc_info.value.status_code == 401

    def test_nonexistent_user_raises_401(self, db):
        token = create_access_token(sub="ghost-user")
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(creds=creds, db=db)
        assert exc_info.value.status_code == 401

    def test_token_with_empty_sub_raises_401(self, db):
        import time
        from jose import jwt as _jwt
        payload = {
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "sub": "",
            "exp": int(time.time()) + 3600,
        }
        token = _jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(creds=creds, db=db)
        assert exc_info.value.status_code == 401
