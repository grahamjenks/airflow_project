-- ============================================================================
-- Cricket Statistics — Supabase schema + Row Level Security
--
-- Run this in the Supabase SQL Editor. It is idempotent: safe to re-run.
--
-- SECURITY: the web app talks to Supabase directly using the public anon key
-- (it ships in the frontend bundle). Row Level Security is therefore the ONLY
-- thing stopping one user from reading or modifying another user's data.
-- These policies scope every row to its owner via `user_id = auth.uid()`.
--
-- If you previously ran the old setup with:
--     CREATE POLICY "Allow all operations" ... USING (true) WITH CHECK (true);
-- that policy is WIDE OPEN (any anon caller can read/write everything). This
-- script drops it. Verify in Dashboard → Authentication → Policies afterwards.
-- ============================================================================

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  short_name  text,
  home_ground text,
  created_at  timestamptz not null default now()
);

create table if not exists players (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  team_id       uuid not null references teams (id) on delete cascade,
  name          text not null,
  role          text,
  batting_style text,
  bowling_style text,
  jersey_number integer,
  created_at    timestamptz not null default now()
);

create table if not exists matches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  match_data      jsonb not null default '{}'::jsonb,
  batting_stats   jsonb not null default '[]'::jsonb,
  bowling_stats   jsonb not null default '[]'::jsonb,
  deliveries      jsonb not null default '[]'::jsonb,
  scorecard_state jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Add columns / owner column on tables that pre-date this script.
alter table teams   add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table players add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table matches add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table matches add column if not exists deliveries jsonb not null default '[]'::jsonb;
alter table matches add column if not exists scorecard_state jsonb not null default '{}'::jsonb;

create index if not exists idx_teams_user      on teams (user_id);
create index if not exists idx_players_user    on players (user_id);
create index if not exists idx_players_team    on players (team_id);
create index if not exists idx_matches_user    on matches (user_id);
create index if not exists idx_matches_updated on matches (updated_at desc);

-- ── updated_at trigger for matches ───────────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_matches_updated_at on matches;
create trigger trg_matches_updated_at
  before update on matches
  for each row execute function set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table teams   enable row level security;
alter table players enable row level security;
alter table matches enable row level security;

-- Remove the legacy wide-open policy if it exists.
drop policy if exists "Allow all operations" on matches;
drop policy if exists "Allow all operations" on teams;
drop policy if exists "Allow all operations" on players;

-- Owner-scoped policies. Re-created cleanly each run.
do $$
declare t text;
begin
  foreach t in array array['teams', 'players', 'matches'] loop
    execute format('drop policy if exists %I on %I', t || '_select_own', t);
    execute format('drop policy if exists %I on %I', t || '_insert_own', t);
    execute format('drop policy if exists %I on %I', t || '_update_own', t);
    execute format('drop policy if exists %I on %I', t || '_delete_own', t);

    execute format(
      'create policy %I on %I for select using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on %I for insert with check (auth.uid() = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on %I for delete using (auth.uid() = user_id)',
      t || '_delete_own', t);
  end loop;
end $$;
