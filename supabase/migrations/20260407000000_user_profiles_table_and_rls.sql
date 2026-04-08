-- Create table + RLS in one go. Paste this entire file into Supabase → SQL Editor → Run.

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  hobbies text[] not null default '{}',
  onboarding_complete boolean not null default false,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  total_sparks integer not null default 0,
  last_spark_date date,
  created_at timestamptz not null default now(),
  name text,
  full_name text,
  display_name text
);

create unique index if not exists user_profiles_user_id_key on public.user_profiles (user_id);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;

create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
