-- Non-destructive content upgrade for Fagalla Fantasy.
-- Run once in Supabase SQL Editor. Existing accounts, teams, points and ads are untouched.

alter table public.settings
  add column if not exists fantasy_logo_url text,
  add column if not exists news_logo_url text;

create table if not exists public.news_items (
  id text primary key,
  title text not null,
  image_url text,
  link_url text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.stories (
  id text primary key,
  title text not null,
  image_url text,
  link_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.news_items enable row level security;
alter table public.stories enable row level security;

drop policy if exists "public news access" on public.news_items;
create policy "public news access" on public.news_items for all using (true) with check (true);

drop policy if exists "public stories access" on public.stories;
create policy "public stories access" on public.stories for all using (true) with check (true);

create index if not exists news_items_created_at_idx on public.news_items (created_at desc);
create index if not exists stories_created_at_idx on public.stories (created_at desc);

-- Public media bucket used by the host image uploader.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "public media read" on storage.objects;
create policy "public media read" on storage.objects for select using (bucket_id = 'media');

drop policy if exists "media upload" on storage.objects;
create policy "media upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'media');

drop policy if exists "media update" on storage.objects;
create policy "media update" on storage.objects for update to anon, authenticated using (bucket_id = 'media') with check (bucket_id = 'media');

drop policy if exists "media delete" on storage.objects;
create policy "media delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'media');
