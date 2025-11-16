# Airflow Project

This project contains an Airflow setup with dbt integration and a Cricket Statistics React application.

## Project Structure

```
airflow_project/
├── dags/              # Airflow DAGs
├── dbt_project/       # dbt models and configuration
├── cricket-ui/        # React Cricket Statistics Tracker
└── logs/              # Log files
```

## Cricket Statistics UI

A modern React application for tracking cricket match statistics with remote storage via Supabase.

### Features

- **Match Details**: Record match information including teams, venue, format, and toss details
- **Batting Statistics**: Track player batting performance with runs, balls, strike rate, boundaries, and dismissals
- **Bowling Statistics**: Record bowling figures including overs, maidens, runs, wickets, economy, average, and strike rate
- **Search & Filter**: Find previous matches with advanced search and filtering
- **Remote Storage**: Automatic cloud sync with Supabase (falls back to localStorage)
- **Export Data**: Download match statistics as JSON

### Getting Started

See [cricket-ui/README.md](./cricket-ui/README.md) for detailed setup instructions.

Quick start:
```bash
cd cricket-ui
npm install
npm run dev
```

### Remote Storage Setup

The app uses Supabase for remote storage. Follow the instructions in [cricket-ui/SUPABASE_SETUP.md](./cricket-ui/SUPABASE_SETUP.md) to set up your Supabase project.

## Airflow & dbt

This project also includes Airflow DAGs and dbt models for data pipeline orchestration.

### Requirements

- Python 3.8+
- Node.js 16+ (for cricket-ui)
- PostgreSQL (for dbt)

### Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Initialize Airflow:
```bash
airflow db init
airflow users create ...
```

## Development

### Cricket UI Development

```bash
cd cricket-ui
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## License

MIT

