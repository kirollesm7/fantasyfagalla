-- Run once in Supabase SQL Editor for football + volleyball league scheduling.
alter table public.matches
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists status text not null default 'upcoming',
  add column if not exists home_score integer not null default 0,
  add column if not exists away_score integer not null default 0;

alter table public.volleyball_matches
  add column if not exists duration_minutes integer not null default 60,
  add column if not exists gw integer,
  add column if not exists note text;
