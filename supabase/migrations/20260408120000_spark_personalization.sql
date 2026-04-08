-- Optional fields for spark image + text personalization (user-controlled; not required).

alter table public.user_profiles
  add column if not exists spark_gender text;

alter table public.user_profiles
  add column if not exists spark_ethnicity text;

alter table public.user_profiles
  add column if not exists spark_ethnicity_custom text;

alter table public.user_profiles
  add column if not exists spark_age_range text;

alter table public.user_profiles
  add column if not exists spark_sleep_start text;

alter table public.user_profiles
  add column if not exists spark_sleep_end text;

alter table public.user_profiles
  add column if not exists spark_timezone text;

comment on column public.user_profiles.spark_gender is 'Optional: male|female for spark imagery only; null = not specified';
comment on column public.user_profiles.spark_ethnicity is 'Preset key or prefer_not|other';
comment on column public.user_profiles.spark_ethnicity_custom is 'When ethnicity is other, user free text';
comment on column public.user_profiles.spark_age_range is 'Age band for imagery tone only';
comment on column public.user_profiles.spark_sleep_start is 'Local sleep start HH:MM in spark_timezone';
comment on column public.user_profiles.spark_sleep_end is 'Local sleep end HH:MM in spark_timezone';
comment on column public.user_profiles.spark_timezone is 'IANA timezone for local time context';
