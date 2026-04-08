-- Run this in Supabase SQL Editor if login works but the app shows "Could not load your profile".
-- It lets each signed-in user read/insert/update only their own row in user_profiles.

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
