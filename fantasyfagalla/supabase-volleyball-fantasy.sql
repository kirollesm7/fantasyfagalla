-- Run once in Supabase SQL Editor. Football fantasy data is not changed.
alter table public.accounts
  add column if not exists volleyball_team jsonb not null default '{"starters":[null,null,null,null,null,null],"bench":[null,null,null,null],"captainId":null,"viceCaptainId":null}'::jsonb,
  add column if not exists volleyball_points jsonb not null default '{}'::jsonb;

create table if not exists public.volleyball_players (
  id text primary key,
  name text not null,
  price numeric not null default 8,
  role text not null default 'Player',
  team_name text,
  color text not null default '#ff7a00',
  active boolean not null default true,
  image_url text,
  country text,
  created_at timestamptz not null default now()
);
alter table public.volleyball_players add column if not exists image_url text;
alter table public.volleyball_players add column if not exists country text;

create table if not exists public.volleyball_matches (
  id text primary key,
  home_team text not null,
  away_team text not null,
  home_country text,
  away_country text,
  kickoff_time timestamptz not null,
  status text not null default 'upcoming',
  home_score integer not null default 0,
  away_score integer not null default 0,
  round_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.volleyball_state (
  id integer primary key default 1 check (id = 1),
  gw integer not null default 1,
  locked boolean not null default false
);
insert into public.volleyball_state (id, gw, locked) values (1, 1, false) on conflict (id) do nothing;

create table if not exists public.volleyball_stats (
  gw integer primary key,
  data jsonb not null default '{}'::jsonb
);
insert into public.volleyball_stats (gw, data) values (1, '{}'::jsonb) on conflict (gw) do nothing;

create table if not exists public.volleyball_leaderboard (
  username text primary key references public.accounts(username) on delete cascade,
  total_points integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.volleyball_players enable row level security;
alter table public.volleyball_state enable row level security;
alter table public.volleyball_stats enable row level security;
alter table public.volleyball_leaderboard enable row level security;
alter table public.volleyball_matches enable row level security;

drop policy if exists "volleyball players access" on public.volleyball_players;
create policy "volleyball players access" on public.volleyball_players for all using (true) with check (true);
drop policy if exists "volleyball state access" on public.volleyball_state;
create policy "volleyball state access" on public.volleyball_state for all using (true) with check (true);
drop policy if exists "volleyball stats access" on public.volleyball_stats;
create policy "volleyball stats access" on public.volleyball_stats for all using (true) with check (true);
drop policy if exists "volleyball leaderboard access" on public.volleyball_leaderboard;
create policy "volleyball leaderboard access" on public.volleyball_leaderboard for all using (true) with check (true);
drop policy if exists "volleyball matches access" on public.volleyball_matches;
create policy "volleyball matches access" on public.volleyball_matches for all using (true) with check (true);
