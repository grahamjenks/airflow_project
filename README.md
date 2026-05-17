# Airflow Project

Monorepo containing an Airflow/dbt data pipeline and a Cricket Statistics web app.

## Cricket UI

The main active project. See [`cricket-ui/README.md`](./cricket-ui/README.md).

```bash
cd cricket-ui
npm install && npm run dev
```

## Airflow & dbt

DAGs and dbt models for data pipeline orchestration.

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
airflow db init
```
