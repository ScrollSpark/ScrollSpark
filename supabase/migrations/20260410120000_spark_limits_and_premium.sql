-- Spark limits: trial (25 total), free (1/day after trial), premium (200/month)
alter table public.user_profiles
  add column if not exists is_premium boolean not null default false;

alter table public.user_profiles
  add column if not exists premium_spark_month text;

alter table public.user_profiles
  add column if not exists premium_sparks_monthly_count integer not null default 0;

comment on column public.user_profiles.is_premium is 'Mirrors RevenueCat entitlement premium; updated by the app.';
comment on column public.user_profiles.premium_spark_month is 'UTC calendar month YYYY-MM for premium monthly counter.';
comment on column public.user_profiles.premium_sparks_monthly_count is 'Sparks used in premium_spark_month (max 200).';
