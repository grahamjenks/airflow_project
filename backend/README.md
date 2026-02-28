# Cricket API (FastAPI)

## Local dev

From repo root:

```bash
docker compose up --build
```

API:
- `GET http://localhost:8000/healthz`
- `GET http://localhost:8000/readyz`

Auth:
- `POST http://localhost:8000/auth/login` with JSON `{ "username": "...", "password": "..." }`

Matches endpoints require `Authorization: Bearer <token>`.

