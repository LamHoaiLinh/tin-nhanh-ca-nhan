begin;

alter table public.user_settings
  drop constraint if exists user_settings_default_sort_check;

alter table public.user_settings
  add constraint user_settings_default_sort_check
  check (default_sort in ('relevance', 'newest', 'oldest'));

alter table public.user_settings
  alter column default_sort set default 'newest';

commit;
