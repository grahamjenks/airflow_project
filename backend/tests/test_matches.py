from __future__ import annotations

import uuid


PAYLOAD = {
    "matchData": {"team1": "India", "team2": "Australia", "venue": "MCG"},
    "battingStats": [],
    "bowlingStats": [],
    "deliveries": [],
    "scorecardState": {},
}

UPDATED_PAYLOAD = {
    **PAYLOAD,
    "matchData": {"team1": "England", "team2": "NZ", "venue": "Lords"},
}


class TestListMatches:
    def test_requires_authentication(self, client):
        res = client.get("/matches")
        assert res.status_code == 403

    def test_returns_empty_list_when_none_exist(self, client, auth_headers):
        res = client.get("/matches", headers=auth_headers)
        assert res.status_code == 200
        assert res.json() == []

    def test_returns_all_created_matches(self, client, auth_headers):
        client.post("/matches", json=PAYLOAD, headers=auth_headers)
        client.post("/matches", json=PAYLOAD, headers=auth_headers)
        res = client.get("/matches", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_respects_limit_parameter(self, client, auth_headers):
        for _ in range(5):
            client.post("/matches", json=PAYLOAD, headers=auth_headers)
        res = client.get("/matches?limit=2", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()) <= 2

    def test_limit_clamped_to_minimum_of_1(self, client, auth_headers):
        client.post("/matches", json=PAYLOAD, headers=auth_headers)
        res = client.get("/matches?limit=0", headers=auth_headers)
        assert res.status_code == 200
        assert len(res.json()) >= 1


class TestGetMatch:
    def test_returns_created_match(self, client, auth_headers):
        created = client.post("/matches", json=PAYLOAD, headers=auth_headers).json()
        res = client.get(f"/matches/{created['id']}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["id"] == created["id"]
        assert res.json()["matchData"] == PAYLOAD["matchData"]

    def test_unknown_id_returns_404(self, client, auth_headers):
        res = client.get(f"/matches/{uuid.uuid4()}", headers=auth_headers)
        assert res.status_code == 404

    def test_requires_authentication(self, client):
        res = client.get(f"/matches/{uuid.uuid4()}")
        assert res.status_code == 403


class TestCreateMatch:
    def test_creates_match_and_returns_201(self, client, auth_headers):
        res = client.post("/matches", json=PAYLOAD, headers=auth_headers)
        assert res.status_code == 201
        data = res.json()
        assert "id" in data
        assert data["matchData"] == PAYLOAD["matchData"]

    def test_created_match_has_timestamps(self, client, auth_headers):
        res = client.post("/matches", json=PAYLOAD, headers=auth_headers)
        data = res.json()
        assert data["created_at"] is not None
        assert data["updated_at"] is not None

    def test_respects_caller_provided_id(self, client, auth_headers):
        match_id = str(uuid.uuid4())
        res = client.post("/matches", json={**PAYLOAD, "id": match_id}, headers=auth_headers)
        assert res.status_code == 201
        assert res.json()["id"] == match_id

    def test_assigns_id_when_none_provided(self, client, auth_headers):
        res = client.post("/matches", json=PAYLOAD, headers=auth_headers)
        assert res.json()["id"] is not None

    def test_stores_batting_and_bowling_stats(self, client, auth_headers):
        payload = {**PAYLOAD, "battingStats": [{"player": "A", "runs": 50}]}
        res = client.post("/matches", json=payload, headers=auth_headers)
        assert res.json()["battingStats"] == [{"player": "A", "runs": 50}]

    def test_requires_authentication(self, client):
        res = client.post("/matches", json=PAYLOAD)
        assert res.status_code == 403


class TestUpdateMatch:
    def test_updates_and_returns_new_data(self, client, auth_headers):
        created = client.post("/matches", json=PAYLOAD, headers=auth_headers).json()
        res = client.put(f"/matches/{created['id']}", json=UPDATED_PAYLOAD, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["matchData"]["team1"] == "England"

    def test_unknown_id_returns_404(self, client, auth_headers):
        res = client.put(f"/matches/{uuid.uuid4()}", json=PAYLOAD, headers=auth_headers)
        assert res.status_code == 404

    def test_requires_authentication(self, client):
        res = client.put(f"/matches/{uuid.uuid4()}", json=PAYLOAD)
        assert res.status_code == 403

    def test_updated_data_is_visible_on_subsequent_get(self, client, auth_headers):
        created = client.post("/matches", json=PAYLOAD, headers=auth_headers).json()
        client.put(f"/matches/{created['id']}", json=UPDATED_PAYLOAD, headers=auth_headers)
        fetched = client.get(f"/matches/{created['id']}", headers=auth_headers).json()
        assert fetched["matchData"]["venue"] == "Lords"


class TestDeleteMatch:
    def test_deletes_match_and_returns_204(self, client, auth_headers):
        created = client.post("/matches", json=PAYLOAD, headers=auth_headers).json()
        res = client.delete(f"/matches/{created['id']}", headers=auth_headers)
        assert res.status_code == 204

    def test_deleted_match_is_no_longer_accessible(self, client, auth_headers):
        created = client.post("/matches", json=PAYLOAD, headers=auth_headers).json()
        client.delete(f"/matches/{created['id']}", headers=auth_headers)
        get_res = client.get(f"/matches/{created['id']}", headers=auth_headers)
        assert get_res.status_code == 404

    def test_deleting_nonexistent_match_returns_204(self, client, auth_headers):
        res = client.delete(f"/matches/{uuid.uuid4()}", headers=auth_headers)
        assert res.status_code == 204

    def test_requires_authentication(self, client):
        res = client.delete(f"/matches/{uuid.uuid4()}")
        assert res.status_code == 403
