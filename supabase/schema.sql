-- Beerlingo database schema. Name-only identity (no email, no passwords).
-- Run this in the Supabase dashboard: Project -> SQL Editor -> New query -> paste -> Run.
--
-- TRUST MODEL: this app has no authentication. The public anon key is the only
-- credential, so ANYONE with the app can read the leaderboard and create/update
-- rows. That's intentional for a casual friends' beer-streak app -- do NOT store
-- anything private in this table.

-- Recreate from scratch. Safe during early development; this DROPS existing data.
drop table if exists public.profiles cascade;

-- One row per person. `id` is self-generated (no link to auth.users anymore).
create table public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  username           text not null,
  current_streak     integer not null default 0,
  last_check_in_date date,               -- local calendar day of the last beer
  expo_push_token    text,               -- device push token, for "someone drank" alerts
  updated_at         timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

-- One account per name, case-insensitive: "Alex", "alex" and "ALEX" are the same
-- person. This is what lets someone "sign in again" just by typing their name.
create unique index profiles_username_lower_idx
  on public.profiles (lower(username));

-- Row Level Security is on, but the policies are wide open to the anon key
-- because there is no logged-in user to scope against (see TRUST MODEL above).
alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "profiles public insert" on public.profiles;
create policy "profiles public insert"
  on public.profiles for insert
  to anon, authenticated
  with check (true);

drop policy if exists "profiles public update" on public.profiles;
create policy "profiles public update"
  on public.profiles for update
  to anon, authenticated
  using (true)
  with check (true);
