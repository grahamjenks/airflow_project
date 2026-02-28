# GKE deployment (Postgres + FastAPI)

This repo provides baseline Kubernetes manifests under `k8s/`.

## Notes
- **Postgres on GKE** is operationally heavier than managed databases. For production consider Cloud SQL.\n+- If you run Postgres in-cluster, ensure you have **backups** (VolumeSnapshots or scheduled pg_dump to GCS).\n+\n+## Apply\n+\n+1) Create a namespace (optional):\n+\n+```bash\n+kubectl create ns cricket\n+```\n+\n+2) Apply manifests:\n+\n+```bash\n+kubectl -n cricket apply -f k8s/\n+```\n+\n+3) Set secrets:\n+- `k8s/secrets.yaml` includes placeholders; replace them (or use your secret manager).\n+\n+## Images\n+- `k8s/api-deployment.yaml` references `IMAGE_REPLACE_ME`.\n+  - Build + push your image (Artifact Registry or GCR), then replace the image value.\n+
