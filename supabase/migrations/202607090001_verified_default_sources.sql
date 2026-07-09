begin;

create or replace function public.seed_verified_default_sources(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
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
    name=excluded.name,
    website_url=excluded.website_url,
    category=excluded.category,
    priority=excluded.priority,
    enabled=true;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

insert into public.source_catalog(name,feed_url,website_url,category,priority,verification_status,notes)
values
  ('Báo Pháp Luật TP. Hồ Chí Minh','https://plo.vn/rss/home.rss','https://plo.vn','Pháp luật doanh nghiệp',8,'verified','Đã kiểm tra thực tế ngày 09/07/2026.'),
  ('Dân Trí - Trang chủ','https://dantri.com.vn/rss/home.rss','https://dantri.com.vn','Tin tổng hợp',7,'verified','Đã kiểm tra thực tế ngày 09/07/2026.'),
  ('Thanh Niên - Trang chủ','https://thanhnien.vn/rss/home.rss','https://thanhnien.vn','Tin tổng hợp',7,'verified','Đã kiểm tra thực tế ngày 09/07/2026.'),
  ('VnExpress - Thời sự','https://vnexpress.net/rss/thoi-su.rss','https://vnexpress.net','Tin tổng hợp',7,'verified','Tên được chuẩn hóa theo đúng tên miền; đã kiểm tra thực tế ngày 09/07/2026.'),
  ('Báo Giáo dục và Thời đại Online','https://giaoducthoidai.vn/rss/home.rss','https://giaoducthoidai.vn','Tin tổng hợp',5,'verified','Đã kiểm tra thực tế ngày 09/07/2026.'),
  ('Báo Sài Gòn Giải Phóng','https://www.sggp.org.vn/rss/home.rss','https://www.sggp.org.vn','Tin tổng hợp',5,'verified','Đã kiểm tra thực tế ngày 09/07/2026.'),
  ('VOV - Trang RSS','https://vov.vn/rss','https://vov.vn','Tin tổng hợp',5,'verified','Tên được chuẩn hóa theo đúng tên miền; đã kiểm tra thực tế ngày 09/07/2026.'),
  ('Sức khỏe & Đời sống - Trang RSS','https://suckhoedoisong.vn/rss','https://suckhoedoisong.vn','Tin tổng hợp',5,'verified','Đã kiểm tra thực tế ngày 09/07/2026.'),
  ('Tuổi Trẻ Online - Tin mới nhất','https://tuoitre.vn/rss/tin-moi-nhat.rss','https://tuoitre.vn','Tin tổng hợp',5,'verified','Đã kiểm tra thực tế ngày 09/07/2026.')
on conflict(feed_url) do update set
  name=excluded.name,
  website_url=excluded.website_url,
  category=excluded.category,
  priority=excluded.priority,
  verification_status='verified',
  notes=excluded.notes;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,email,display_name)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)))
  on conflict do nothing;

  insert into public.user_settings(user_id) values(new.id) on conflict do nothing;

  insert into public.category_preferences(user_id,category,weight) values
    (new.id,'Thuế và kế toán',10),(new.id,'Hóa đơn điện tử',10),(new.id,'Pháp luật doanh nghiệp',9),
    (new.id,'Lao động, tiền lương và bảo hiểm xã hội',9),(new.id,'Giao thông và đào tạo lái xe',9),
    (new.id,'Quản trị doanh nghiệp',8),(new.id,'AI và tự động hóa',8),(new.id,'Excel, VBA và Python',8),
    (new.id,'Tài chính và kinh tế',7),(new.id,'Ô tô',6),(new.id,'Giáo dục',5),(new.id,'Sức khỏe',5),
    (new.id,'Thể thao',2),(new.id,'Giải trí',1)
  on conflict do nothing;

  insert into public.keyword_rules(user_id,keyword,rule_type,target_field,weight) values
    (new.id,'thuế','positive','all',4),(new.id,'hóa đơn điện tử','positive','all',6),(new.id,'nghị định','positive','title',3),
    (new.id,'thông tư','positive','title',3),(new.id,'quyết định','positive','title',2),(new.id,'báo cáo tài chính','positive','all',5),
    (new.id,'quyết toán','positive','all',5),(new.id,'bảo hiểm xã hội','positive','all',5),(new.id,'tiền lương','positive','all',4),
    (new.id,'tai nạn lao động','positive','all',5),(new.id,'doanh nghiệp','positive','title',2),(new.id,'đào tạo lái xe','positive','all',6),
    (new.id,'sát hạch lái xe','positive','all',6),(new.id,'giấy phép lái xe','positive','all',5),(new.id,'giao thông','positive','title',3),
    (new.id,'ô tô','positive','all',3),(new.id,'trí tuệ nhân tạo','positive','all',4),(new.id,'tự động hóa','positive','all',5),
    (new.id,'Excel','positive','all',5),(new.id,'VBA','positive','all',5),(new.id,'Python','positive','all',4)
  on conflict do nothing;

  perform public.seed_verified_default_sources(new.id);
  return new;
end;
$$;

-- Bổ sung nguồn cho các tài khoản đã tồn tại trước migration này.
select public.seed_verified_default_sources(id) from auth.users;

-- Chỉ trigger/migration do chủ sở hữu database thực thi hàm này.
revoke all on function public.seed_verified_default_sources(uuid) from public;
revoke all on function public.seed_verified_default_sources(uuid) from anon;
revoke all on function public.seed_verified_default_sources(uuid) from authenticated;

commit;
