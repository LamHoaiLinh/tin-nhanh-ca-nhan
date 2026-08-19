-- Backend Tin Nhanh Ca Nhan dung chung project family-farm-online.
-- Da ap dung vao project qjpcxhackvoewcxlatis ngay 2026-08-19.
-- File tham chieu van hanh; khong chay lai cac migration cu tao public.profiles.

begin;
create extension if not exists pgcrypto;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  feed_url text not null,
  website_url text,
  logo_url text,
  category text not null default 'Tin tổng hợp',
  priority smallint not null default 5 check (priority between 1 and 10),
  enabled boolean not null default true,
  last_scanned_at timestamptz,
  last_success_at timestamptz,
  last_status text,
  last_error text,
  consecutive_errors integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, feed_url)
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  guid text,
  original_url text not null,
  canonical_url text not null,
  title text not null,
  normalized_title text not null,
  search_text text not null default '',
  description text not null default '',
  image_url text,
  author text,
  category text not null default 'Tin tổng hợp',
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  url_hash text not null,
  title_hash text not null,
  simhash text not null,
  relevance_score numeric(5,2) not null default 0 check (relevance_score between 0 and 100),
  matched_keywords jsonb not null default '[]'::jsonb,
  score_breakdown jsonb not null default '{}'::jsonb,
  duplicate_of uuid references public.articles(id) on delete set null,
  duplicate_count integer not null default 0,
  representative_score numeric(7,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.article_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  is_read boolean not null default false,
  is_saved boolean not null default false,
  is_hidden boolean not null default false,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, article_id)
);

create table if not exists public.keyword_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  rule_type text not null check (rule_type in ('positive','negative','required')),
  target_field text not null default 'all' check (target_field in ('title','description','all')),
  weight numeric(6,2) not null default 1 check (weight > 0 and weight <= 100),
  enabled boolean not null default true,
  unique(user_id, keyword, rule_type, target_field)
);

create table if not exists public.category_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  weight smallint not null default 5 check (weight between 0 and 10),
  enabled boolean not null default true,
  unique(user_id, category)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scan_interval_minutes integer not null default 180 check (scan_interval_minutes between 15 and 1440),
  article_retention_days integer not null default 3 check (article_retention_days between 1 and 3650),
  scan_log_retention_days integer not null default 3 check (scan_log_retention_days between 1 and 3650),
  database_limit_mb integer not null default 500 check (database_limit_mb between 100 and 1048576),
  page_size integer not null default 20 check (page_size in (10,20,30,50)),
  duplicate_threshold numeric(4,3) not null default 0.820,
  default_sort text not null default 'newest' check (default_sort in ('relevance','newest','oldest')),
  show_hidden boolean not null default false,
  image_fallback_mode text not null default 'logo' check (image_fallback_mode in ('logo','category'))
);

create table if not exists public.scan_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  items_received integer not null default 0,
  items_inserted integer not null default 0,
  duplicates_found integer not null default 0,
  status text not null default 'running' check (status in ('running','success','partial','error')),
  error_message text
);

create table if not exists public.source_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  website_url text,
  logo_url text,
  category text not null default 'Tin tổng hợp',
  priority smallint not null default 5 check (priority between 1 and 10),
  verification_status text not null default 'needs_runtime_check' check (verification_status in ('verified','needs_runtime_check')),
  notes text
);

create index if not exists idx_sources_user on public.sources(user_id);
create index if not exists idx_sources_enabled on public.sources(user_id, enabled);
create index if not exists idx_articles_canonical_url on public.articles(canonical_url);
create index if not exists idx_articles_url_hash on public.articles(url_hash);
create index if not exists idx_articles_title_hash on public.articles(title_hash);
create index if not exists idx_articles_published_at on public.articles(published_at desc);
create index if not exists idx_articles_source on public.articles(source_id, published_at desc);
create unique index if not exists idx_articles_source_guid_unique on public.articles(source_id, guid) where guid is not null;
create unique index if not exists idx_articles_source_url_unique on public.articles(source_id, url_hash);
create index if not exists idx_articles_duplicate_of on public.articles(duplicate_of);
create index if not exists idx_articles_search_text on public.articles using gin (to_tsvector('simple', search_text));
create index if not exists idx_article_states_user on public.article_states(user_id, article_id);
create index if not exists idx_rules_user on public.keyword_rules(user_id, enabled);
create index if not exists idx_category_user on public.category_preferences(user_id, enabled);
create index if not exists idx_scan_logs_source on public.scan_logs(source_id, started_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists sources_set_updated_at on public.sources;
create trigger sources_set_updated_at before update on public.sources for each row execute function public.set_updated_at();
drop trigger if exists states_set_updated_at on public.article_states;
create trigger states_set_updated_at before update on public.article_states for each row execute function public.set_updated_at();

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.article_states enable row level security;
alter table public.keyword_rules enable row level security;
alter table public.category_preferences enable row level security;
alter table public.user_settings enable row level security;
alter table public.scan_logs enable row level security;
alter table public.source_catalog enable row level security;

create policy "sources_all_own" on public.sources for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "articles_select_own_sources" on public.articles for select using (exists(select 1 from public.sources s where s.id=source_id and s.user_id=auth.uid()));
create policy "states_all_own" on public.article_states for all using (user_id=auth.uid()) with check (user_id=auth.uid() and exists(select 1 from public.articles a join public.sources s on s.id=a.source_id where a.id=article_id and s.user_id=auth.uid()));
create policy "rules_all_own" on public.keyword_rules for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "categories_all_own" on public.category_preferences for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "settings_all_own" on public.user_settings for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "scan_logs_select_own" on public.scan_logs for select using (exists(select 1 from public.sources s where s.id=source_id and s.user_id=auth.uid()));
create policy "catalog_read_authenticated" on public.source_catalog for select to authenticated using (true);

create or replace view public.article_feed with (security_invoker=true) as
select
  a.id,a.source_id,a.guid,a.original_url,a.canonical_url,a.title,a.description,a.image_url,a.author,a.category,
  a.published_at,a.fetched_at,a.relevance_score,a.duplicate_count,a.matched_keywords,a.score_breakdown,a.search_text,
  s.name as source_name,s.logo_url as source_logo_url,s.priority as source_priority,
  coalesce(st.is_read,false) as is_read,coalesce(st.is_saved,false) as is_saved,coalesce(st.is_hidden,false) as is_hidden
from public.articles a
join public.sources s on s.id=a.source_id
left join public.article_states st on st.article_id=a.id and st.user_id=auth.uid()
where s.user_id=auth.uid() and s.enabled=true and a.duplicate_of is null;

grant select on public.article_feed to authenticated;
grant select,insert,update,delete on public.sources,public.article_states,public.keyword_rules,public.category_preferences,public.user_settings to authenticated;
grant select on public.articles,public.scan_logs,public.source_catalog to authenticated;

insert into public.source_catalog(name,feed_url,website_url,category,priority,verification_status,notes) values
('VnExpress - Tin mới nhất','https://vnexpress.net/rss/tin-moi-nhat.rss','https://vnexpress.net','Tin tổng hợp',8,'needs_runtime_check','Phải kiểm tra lại bằng chức năng Kiểm tra RSS trước khi thêm.'),
('Tuổi Trẻ - Tin mới nhất','https://tuoitre.vn/rss/tin-moi-nhat.rss','https://tuoitre.vn','Tin tổng hợp',8,'needs_runtime_check','URL báo chí có thể thay đổi.'),
('Thanh Niên - Trang chủ','https://thanhnien.vn/rss/home.rss','https://thanhnien.vn','Tin tổng hợp',7,'needs_runtime_check','URL báo chí có thể thay đổi.'),
('VietnamNet - Tin mới nhất','https://vietnamnet.vn/rss/tin-moi-nhat.rss','https://vietnamnet.vn','Tin tổng hợp',7,'needs_runtime_check','URL báo chí có thể thay đổi.'),
('Dân Trí - Trang chủ','https://dantri.com.vn/rss/home.rss','https://dantri.com.vn','Tin tổng hợp',7,'needs_runtime_check','URL báo chí có thể thay đổi.'),
('Lao Động - Trang chủ','https://laodong.vn/rss/home.rss','https://laodong.vn','Lao động, tiền lương và bảo hiểm xã hội',8,'needs_runtime_check','URL báo chí có thể thay đổi.'),
('Pháp Luật TP.HCM - Trang chủ','https://plo.vn/rss/home.rss','https://plo.vn','Pháp luật doanh nghiệp',8,'needs_runtime_check','URL báo chí có thể thay đổi.'),
('Báo Chính phủ - Trang chủ','https://baochinhphu.vn/rss/home.rss','https://baochinhphu.vn','Pháp luật doanh nghiệp',9,'needs_runtime_check','Nguồn chính thức; vẫn kiểm tra runtime trước khi thêm.')
on conflict(feed_url) do update set name=excluded.name,website_url=excluded.website_url,category=excluded.category,priority=excluded.priority,notes=excluded.notes;


create table if not exists public.news_runtime_config (
  id boolean primary key default true check (id),
  cron_secret text not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now()
);
insert into public.news_runtime_config(id) values (true) on conflict (id) do nothing;
alter table public.news_runtime_config enable row level security;
revoke all on table public.news_runtime_config from public, anon, authenticated;
grant select on table public.news_runtime_config to service_role;

create or replace function public.seed_verified_default_sources(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare inserted_count integer;
begin
  insert into public.sources(user_id,name,feed_url,website_url,category,priority,enabled)
  values
    (target_user_id,'Báo Pháp Luật TP. Hồ Chí Minh','https://plo.vn/rss/home.rss','https://plo.vn','Pháp luật doanh nghiệp',8,true),
    (target_user_id,'Dân Trí - Trang chủ','https://dantri.com.vn/rss/home.rss','https://dantri.com.vn','Tin tổng hợp',7,true),
    (target_user_id,'Thanh Niên - Trang chủ','https://thanhnien.vn/rss/home.rss','https://thanhnien.vn','Tin tổng hợp',7,true),
    (target_user_id,'VnExpress - Thời sự','https://vnexpress.net/rss/thoi-su.rss','https://vnexpress.net','Tin tổng hợp',7,true),
    (target_user_id,'Báo Giáo dục và Thời đại Online','https://giaoducthoidai.vn/rss/home.rss','https://giaoducthoidai.vn','Tin tổng hợp',5,true),
    (target_user_id,'Báo Sài Gòn Giải Phóng','https://www.sggp.org.vn/rss/home.rss','https://www.sggp.org.vn','Tin tổng hợp',5,true),
    (target_user_id,'VOV - Trang RSS','https://vov.vn/rss','https://vov.vn','Tin tổng hợp',5,true),
    (target_user_id,'Sức khỏe & Đời sống - Trang RSS','https://suckhoedoisong.vn/rss','https://suckhoedoisong.vn','Tin tổng hợp',5,true),
    (target_user_id,'Tuổi Trẻ Online - Tin mới nhất','https://tuoitre.vn/rss/tin-moi-nhat.rss','https://tuoitre.vn','Tin tổng hợp',5,true)
  on conflict(user_id,feed_url) do update set
    name=excluded.name, website_url=excluded.website_url, category=excluded.category,
    priority=excluded.priority, enabled=true;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.seed_verified_default_sources(uuid) from public, anon, authenticated;

create or replace function public.seed_news_user_defaults(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Tài khoản không tồn tại.';
  end if;
  insert into public.user_settings(user_id,scan_interval_minutes,article_retention_days,scan_log_retention_days)
  values(target_user_id,180,3,3)
  on conflict(user_id) do update set
    scan_interval_minutes=180, article_retention_days=3, scan_log_retention_days=3;

  insert into public.category_preferences(user_id,category,weight) values
    (target_user_id,'Thuế và kế toán',10),(target_user_id,'Hóa đơn điện tử',10),(target_user_id,'Pháp luật doanh nghiệp',9),
    (target_user_id,'Lao động, tiền lương và bảo hiểm xã hội',9),(target_user_id,'Giao thông và đào tạo lái xe',9),
    (target_user_id,'Quản trị doanh nghiệp',8),(target_user_id,'AI và tự động hóa',8),(target_user_id,'Excel, VBA và Python',8),
    (target_user_id,'Tài chính và kinh tế',7),(target_user_id,'Ô tô',6),(target_user_id,'Giáo dục',5),(target_user_id,'Sức khỏe',5),
    (target_user_id,'Thể thao',2),(target_user_id,'Giải trí',1)
  on conflict(user_id,category) do nothing;

  insert into public.keyword_rules(user_id,keyword,rule_type,target_field,weight) values
    (target_user_id,'thuế','positive','all',4),(target_user_id,'hóa đơn điện tử','positive','all',6),
    (target_user_id,'nghị định','positive','title',3),(target_user_id,'thông tư','positive','title',3),
    (target_user_id,'quyết định','positive','title',2),(target_user_id,'báo cáo tài chính','positive','all',5),
    (target_user_id,'quyết toán','positive','all',5),(target_user_id,'bảo hiểm xã hội','positive','all',5),
    (target_user_id,'tiền lương','positive','all',4),(target_user_id,'tai nạn lao động','positive','all',5),
    (target_user_id,'doanh nghiệp','positive','title',2),(target_user_id,'đào tạo lái xe','positive','all',6),
    (target_user_id,'sát hạch lái xe','positive','all',6),(target_user_id,'giấy phép lái xe','positive','all',5),
    (target_user_id,'giao thông','positive','title',3),(target_user_id,'ô tô','positive','all',3),
    (target_user_id,'trí tuệ nhân tạo','positive','all',4),(target_user_id,'tự động hóa','positive','all',5),
    (target_user_id,'Excel','positive','all',5),(target_user_id,'VBA','positive','all',5),(target_user_id,'Python','positive','all',4)
  on conflict(user_id,keyword,rule_type,target_field) do nothing;

  perform public.seed_verified_default_sources(target_user_id);
end;
$$;
revoke all on function public.seed_news_user_defaults(uuid) from public, anon, authenticated;

create or replace function public.ensure_news_user_defaults()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_user_id uuid := auth.uid();
begin
  if target_user_id is null then raise exception 'Yêu cầu đăng nhập.'; end if;
  perform public.seed_news_user_defaults(target_user_id);
end;
$$;
revoke all on function public.ensure_news_user_defaults() from public, anon;
grant execute on function public.ensure_news_user_defaults() to authenticated;

do $$
declare account record;
begin
  for account in select id from auth.users loop
    perform public.seed_news_user_defaults(account.id);
  end loop;
end $$;

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
grant execute on function public.get_database_storage_bytes() to authenticated, service_role;

create or replace function public.cleanup_news_retention()
returns table(deleted_articles bigint, deleted_logs bigint)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare article_count bigint := 0; log_count bigint := 0;
begin
  delete from public.scan_logs
  where started_at < now() - interval '3 days';
  get diagnostics log_count = row_count;

  delete from public.articles
  where published_at < now() - interval '3 days'
     or fetched_at < now() - interval '3 days';
  get diagnostics article_count = row_count;

  return query select article_count, log_count;
end;
$$;
revoke all on function public.cleanup_news_retention() from public, anon, authenticated;
grant execute on function public.cleanup_news_retention() to service_role;

commit;


create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
create extension if not exists pg_net;

select cron.schedule(
  'news_scan_every_3_hours',
  '0 */3 * * *',
  $job$
    select net.http_post(
      url := 'https://qjpcxhackvoewcxlatis.supabase.co/functions/v1/scan-rss',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select cron_secret from public.news_runtime_config where id = true)
      ),
      body := jsonb_build_object('sourceId', source.id),
      timeout_milliseconds := 120000
    )
    from public.sources as source
    where source.enabled = true;
  $job$
);

select cron.schedule(
  'news_cleanup_every_3_hours',
  '20 */3 * * *',
  $job$
    select public.cleanup_news_retention();
    delete from cron.job_run_details where end_time < now() - interval '3 days';
  $job$
);

