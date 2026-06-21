# Cricket Statistics

A web app for live cricket scoring and statistics — ball-by-ball scoring, full
scorecards, batting/bowling stats, team & player management, and a worm chart.

## Stack

- **Frontend:** React + Vite ([`cricket-ui/`](./cricket-ui/))
- **Backend / storage:** [Supabase](https://supabase.com) (Postgres + Auth) when
  configured; falls back to browser **localStorage** for guests (no sign-in).

There is no separate application server — the app talks to Supabase directly, with
access controlled by Row Level Security (see below).

## Quick start

```bash
cd cricket-ui
npm install
npm run dev
```

Without Supabase credentials the app runs in **local-storage mode** (single device,
no sign-in). To enable cloud sync across devices, configure Supabase.

## Supabase setup

1. Follow [`cricket-ui/SUPABASE_SETUP.md`](./cricket-ui/SUPABASE_SETUP.md).
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor. It
   creates the tables and enables **owner-scoped Row Level Security** so each user can
   only access their own data.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `cricket-ui/.env`.

> **Security:** the app uses the public anon key, so RLS is the only access control.
> Never use an "allow all" policy. See the notes in `SUPABASE_SETUP.md`.

## Tests

```bash
cd cricket-ui
npm test
```
