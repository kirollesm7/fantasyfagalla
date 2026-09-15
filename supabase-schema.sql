-- ============================================
-- Fantasy Faggala League — complete Supabase schema (React version)
-- Safe to run more than once: every statement uses "if not exists" /
-- "or replace" / "drop policy if exists" first.
-- Paste into: Supabase > SQL Editor > New query > Run
-- ============================================

-- 1) اللاعبين (اللي الهوست بيضيفهم)
create table if not exists players (
  id          text primary key,
  name        text not null,
  price       numeric not null default 0,
  color       text not null default '#3C7A4F',
  locked      boolean not null default false,
  created_at  timestamptz default now()
);

-- 2) الحسابات (كل مستخدم: الباسورد + تشكيلته + نقطه)
create table if not exists accounts (
  username       text primary key,
  password_hash  text not null,
  team           jsonb not null default '{"starters":[null,null,null,null],"bench":[null,null,null],"captainId":null,"wildcards":{"benchBoost":null,"tripleCaptain":null}}'::jsonb,
  points         jsonb not null default '{}'::jsonb,
  created_at     timestamptz default now()
);

-- 3) حالة اللعبة (الجيم ويك الحالي + مقفول ولا مفتوح) — صف واحد بس
create table if not exists game_state (
  id      int primary key default 1,
  gw      int not null default 1,
  locked  boolean not null default false,
  constraint game_state_single_row check (id = 1)
);
insert into game_state (id, gw, locked)
values (1, 1, false)
on conflict (id) do nothing;

-- 4) نقط كل جيم ويك (الهوست بيكتبها) — data = {"player_id": {goals, assists, ...}}
create table if not exists gw_stats (
  gw          int primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

-- 5) الترتيب العام (كاش — الواجهة دايمًا بتعيد حسابه من accounts.points الحقيقي،
--    ده بس مرجع احتياطي)
create table if not exists leaderboard (
  username      text primary key references accounts(username) on delete cascade,
  total_points  numeric not null default 0,
  updated_at    timestamptz default now()
);

-- 6) الإعلانات (بانرات يديرها الهوست وتظهر للاعبين في تبويب "فريقي")
create table if not exists ads (
  id         text primary key,
  title      text not null default '',
  image_url  text,
  images     jsonb not null default '[]'::jsonb,
  link_url   text,
  active     boolean not null default true,
  created_at timestamptz default now()
);

-- 7) مواعيد الماتشات
create table if not exists matches (
  id           text primary key,
  home_team    text not null,
  away_team    text not null,
  kickoff_time timestamptz not null,
  gw           int,
  note         text,
  created_at   timestamptz default now()
);

-- 8) إعدادات الهوية (اللوجو وصورة الغلاف)
create table if not exists settings (
  id              int primary key default 1 check (id = 1),
  logo_url        text,
  cover_photo_url text,
  updated_at      timestamptz default now()
);

-- 9) توكنز إشعارات الموبايل (Firebase Cloud Messaging)
create table if not exists push_subscriptions (
  id          text primary key,
  username    text references accounts(username) on delete cascade,
  token       text not null unique,
  created_at  timestamptz default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "public access push_subscriptions" on push_subscriptions;
create policy "public access push_subscriptions" on push_subscriptions for all using (true) with check (true);

-- ============================================
-- صلاحيات الوصول (RLS) — الأبليكيشن بيشتغل من المتصفح مباشرة بمفتاح anon
-- ============================================
alter table players    enable row level security;
alter table accounts   enable row level security;
alter table game_state enable row level security;
alter table gw_stats   enable row level security;
alter table leaderboard enable row level security;
alter table ads        enable row level security;
alter table matches    enable row level security;
alter table settings   enable row level security;

drop policy if exists "public access players"    on players;
drop policy if exists "public access accounts"   on accounts;
drop policy if exists "public access game_state" on game_state;
drop policy if exists "public access gw_stats"   on gw_stats;
drop policy if exists "public access leaderboard" on leaderboard;
drop policy if exists "public access ads"        on ads;
drop policy if exists "public access matches"    on matches;
drop policy if exists "public access settings"   on settings;

create policy "public access players"    on players    for all using (true) with check (true);
create policy "public access accounts"   on accounts   for all using (true) with check (true);
create policy "public access game_state" on game_state for all using (true) with check (true);
create policy "public access gw_stats"   on gw_stats   for all using (true) with check (true);
create policy "public access leaderboard" on leaderboard for all using (true) with check (true);
create policy "public access ads"        on ads        for all using (true) with check (true);
create policy "public access matches"    on matches    for all using (true) with check (true);
create policy "public access settings"   on settings   for all using (true) with check (true);

-- ============================================
-- Storage bucket for uploaded photos (ad images, etc.)
-- ============================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public upload media" on storage.objects;
create policy "public upload media" on storage.objects
  for insert to public
  with check (bucket_id = 'media');

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects
  for select to public
  using (bucket_id = 'media');

drop policy if exists "public delete media" on storage.objects;
create policy "public delete media" on storage.objects
  for delete to public
  using (bucket_id = 'media');

-- ============================================
-- تأكيد إن كل جدول ليه Primary Key فعلي — لو الجدول اتعدّل يدوي من غير
-- الملف ده، ممكن الـ PK يضيع وساعتها الحفظ بيبوظ بصمت
-- ============================================
do $$
begin
  if not exists (select 1 from information_schema.table_constraints
                  where table_name='game_state' and constraint_type='PRIMARY KEY') then
    alter table game_state add primary key (id);
  end if;
  if not exists (select 1 from information_schema.table_constraints
                  where table_name='gw_stats' and constraint_type='PRIMARY KEY') then
    alter table gw_stats add primary key (gw);
  end if;
  if not exists (select 1 from information_schema.table_constraints
                  where table_name='accounts' and constraint_type='PRIMARY KEY') then
    alter table accounts add primary key (username);
  end if;
  if not exists (select 1 from information_schema.table_constraints
                  where table_name='players' and constraint_type='PRIMARY KEY') then
    alter table players add primary key (id);
  end if;
end $$;

-- خلاص! دلوقتي روح Settings > API وخد Project URL + anon public key
-- وحطهم في src/lib/supabaseClient.js
