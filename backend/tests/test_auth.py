from __future__ import annotations


class TestLogin:
    def test_success_returns_token(self, client, test_user):
        res = client.post("/auth/login", json={"username": "testuser", "password": "testpass"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_wrong_password_returns_401(self, client, test_user):
        res = client.post("/auth/login", json={"username": "testuser", "password": "wrong"})
        assert res.status_code == 401
        assert "Invalid credentials" in res.json()["detail"]

    def test_unknown_user_returns_401(self, client):
        res = client.post("/auth/login", json={"username": "nobody", "password": "pass"})
        assert res.status_code == 401

    def test_missing_password_returns_422(self, client):
        res = client.post("/auth/login", json={"username": "testuser"})
        assert res.status_code == 422

    def test_missing_username_returns_422(self, client):
        res = client.post("/auth/login", json={"password": "testpass"})
        assert res.status_code == 422

    def test_returned_token_grants_access(self, client, test_user):
        login_res = client.post("/auth/login", json={"username": "testuser", "password": "testpass"})
        token = login_res.json()["access_token"]
        res = client.get("/matches", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200


class TestRegister:
    def test_success_returns_201_with_token(self, client):
        res = client.post("/auth/register", json={"username": "newuser", "password": "newpass"})
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_duplicate_username_returns_409(self, client, test_user):
        res = client.post("/auth/register", json={"username": "testuser", "password": "other"})
        assert res.status_code == 409
        assert "already taken" in res.json()["detail"]

    def test_missing_username_returns_422(self, client):
        res = client.post("/auth/register", json={"password": "pass"})
        assert res.status_code == 422

    def test_returned_token_grants_access_to_protected_routes(self, client):
        res = client.post("/auth/register", json={"username": "fresh", "password": "pass"})
        assert res.status_code == 201
        token = res.json()["access_token"]
        r2 = client.get("/matches", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200

    def test_two_distinct_users_can_register(self, client):
        r1 = client.post("/auth/register", json={"username": "user1", "password": "pass"})
        r2 = client.post("/auth/register", json={"username": "user2", "password": "pass"})
        assert r1.status_code == 201
        assert r2.status_code == 201
