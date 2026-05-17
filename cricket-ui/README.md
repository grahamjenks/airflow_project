# Cricket Statistics Tracker

A React app for ball-by-ball cricket scoring with live scores and statistics.

## Features

- **Live Scoring** — ball-by-ball scoring with extras, wickets, no-balls, wides, and retirements
- **Scorecards** — real-time batting and bowling scorecards derived from deliveries
- **Statistics** — run rate by over, fall of wickets, extras breakdown, worm chart
- **Live Scores** — public feed of in-progress matches with worm chart and scorecard
- **Player Stats** — career batting and bowling aggregates across all matches
- **Teams** — manage squads with player roles (keeper, bowler, all-rounder, batter)
- **Cloud Sync** — auto-saves to Supabase; falls back to localStorage if unconfigured

## Tech Stack

- React 18 + Vite
- Supabase (PostgreSQL + auth)
- Recharts

## Getting Started

```bash
npm install
cp .env.example .env   # add your Supabase credentials
npm run dev
```

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for database setup and [DEPLOYMENT.md](./DEPLOYMENT.md) for production.
