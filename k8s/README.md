# GKE deployment (Postgres + FastAPI)

This repo provides baseline Kubernetes manifests under `k8s/`.

## Notes
- **Postgres on GKE** is operationally heavier than managed databases. For production consider Cloud SQL.
- If you run Postgres in-cluster, ensure you have **backups** (VolumeSnapshots or scheduled `pg_dump` to GCS).

## Apply

1) Create a namespace (optional):

```bash
kubectl create ns cricket
```

2) Set secrets. `k8s/secrets.yaml` is **gitignored** — create it from the template
   and fill in strong, unique values (do not commit it):

```bash
cp k8s/secrets.example.yaml k8s/secrets.yaml
# edit k8s/secrets.yaml, e.g. generate values with: openssl rand -base64 32
kubectl -n cricket apply -f k8s/secrets.yaml
```

   `JWT_SECRET` and `ADMIN_PASSWORD` are **required** — the API fails to start if they
   are unset, so it can never boot with a guessable default.

3) Apply the remaining manifests (the example secret is excluded):

```bash
kubectl -n cricket apply -f k8s/ --prune=false \
  $(ls k8s/*.yaml | grep -v secrets.example.yaml | sed 's/^/-f /')
```

   Or simply apply the individual files you need.

## Images
- `k8s/api-deployment.yaml` references `IMAGE_REPLACE_ME`.
  - Build + push your image (Artifact Registry or GCR), then replace the image value.
