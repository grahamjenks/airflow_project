from __future__ import annotations

from app.main import parse_cors_origins


class TestParseCorsOrigins:
    def test_single_origin(self):
        assert parse_cors_origins("http://localhost:3000") == ["http://localhost:3000"]

    def test_multiple_comma_separated_origins(self):
        result = parse_cors_origins("http://a.com,http://b.com")
        assert result == ["http://a.com", "http://b.com"]

    def test_strips_whitespace_around_entries(self):
        result = parse_cors_origins("  http://a.com  ,  http://b.com  ")
        assert result == ["http://a.com", "http://b.com"]

    def test_empty_string_returns_empty_list(self):
        assert parse_cors_origins("") == []

    def test_none_like_empty_returns_empty_list(self):
        assert parse_cors_origins("   ") == []

    def test_filters_blank_entries_between_commas(self):
        result = parse_cors_origins("http://a.com,,http://b.com")
        assert result == ["http://a.com", "http://b.com"]


class TestHealthEndpoints:
    def test_healthz_returns_200_ok(self, client):
        res = client.get("/healthz")
        assert res.status_code == 200
        assert res.json() == {"ok": True}

    def test_readyz_returns_200_when_db_reachable(self, client):
        res = client.get("/readyz")
        assert res.status_code == 200
        assert res.json()["ok"] is True

    def test_request_id_header_is_present_in_response(self, client):
        res = client.get("/healthz")
        assert "x-request-id" in res.headers

    def test_custom_request_id_is_echoed_back(self, client):
        res = client.get("/healthz", headers={"X-Request-ID": "my-trace-123"})
        assert res.headers.get("x-request-id") == "my-trace-123"


class TestSchemas:
    """Pydantic schema validation lives in schemas.py — covered here via the API layer."""

    def test_login_with_extra_fields_is_accepted(self, client):
        res = client.post("/auth/login", json={"username": "x", "password": "y", "extra": "ignored"})
        assert res.status_code in (200, 401)

    def test_create_match_with_minimal_payload(self, client, auth_headers):
        res = client.post("/matches", json={}, headers=auth_headers)
        assert res.status_code == 201
