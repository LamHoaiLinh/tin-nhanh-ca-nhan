begin;

alter table public.user_settings
  add column if not exists scan_log_retention_days integer not null default 30,
  add column if not exists database_limit_mb integer not null default 500;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_settings_scan_log_retention_days_check'
      and conrelid = 'public.user_settings'::regclass
  ) then
    alter table public.user_settings
      add constraint user_settings_scan_log_retention_days_check
      check (scan_log_retention_days between 7 and 3650);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'user_settings_database_limit_mb_check'
      and conrelid = 'public.user_settings'::regclass
  ) then
    alter table public.user_settings
      add constraint user_settings_database_limit_mb_check
      check (database_limit_mb between 100 and 1048576);
  end if;
end $$;

update public.user_settings
set default_sort = 'newest'
where default_sort <> 'newest';

alter table public.user_settings
  alter column default_sort set default 'newest';

create or replace function public.get_database_storage_bytes()
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select pg_database_size(current_database());
$$;

revoke all on function public.get_database_storage_bytes() from public;
grant execute on function public.get_database_storage_bytes() to authenticated;
grant execute on function public.get_database_storage_bytes() to service_role;

commit;
