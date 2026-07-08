# HƯỚNG DẪN TRIỂN KHAI TỪNG BƯỚC

## 1. Chuẩn bị

- GitHub account.
- Supabase account.
- Render account.
- Node.js 22+.
- Git và Supabase CLI.

## 2. Đưa source lên GitHub

```bash
git init
git add .
git commit -m "Initial Tin Nhanh Ca Nhan"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY
git push -u origin main
```

Không commit `.env.local`, service role hoặc CRON_SECRET.

## 3. Supabase Database

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Kiểm tra Table Editor có các bảng: `profiles`, `sources`, `articles`, `article_states`, `keyword_rules`, `category_preferences`, `user_settings`, `scan_logs`, `source_catalog`.

## 4. Edge Functions

```bash
supabase functions deploy validate-feed
supabase functions deploy discover-feed
supabase functions deploy scan-rss
```

`supabase/config.toml` đặt `verify_jwt=false` vì mỗi function tự xác thực JWT hoặc CRON_SECRET. Không bỏ hàm `authenticate` trong source.

Tạo secret cron:

```bash
supabase secrets set CRON_SECRET="THAY_BANG_CHUOI_NGAU_NHIEN_32_KY_TU_TRO_LEN"
```

## 5. Authentication

Trong Supabase Dashboard:

1. Authentication > Providers > Email: bật Email.
2. Authentication > URL Configuration:
   - Site URL: URL Render sau khi deploy.
   - Redirect URLs: `http://localhost:5173/**` và `https://TEN-APP.onrender.com/**`.
3. Có thể tắt Confirm email trong giai đoạn kiểm thử nội bộ; production nên bật.

## 6. Render

Chọn New > Blueprint, kết nối repository. `render.yaml` tự cấu hình static site.

Điền:

- `VITE_SUPABASE_URL`.
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Không điền service role vào Render frontend.

## 7. GitHub Secrets

Repository > Settings > Secrets and variables > Actions:

- `SUPABASE_URL`: `https://PROJECT_REF.supabase.co`.
- `CRON_SECRET`: giống secret đã đặt ở Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chỉ dùng cleanup workflow.

Vào Actions > Scan RSS > Run workflow để thử thủ công.

## 8. Tạo tài khoản đầu tiên

Mở website Render > Tạo tài khoản. Trigger database tự tạo dữ liệu mặc định. Sau đó:

1. Vào Nguồn tin.
2. Chọn nguồn gợi ý hoặc dán RSS.
3. Kiểm tra RSS.
4. Lưu và quét.
5. Vào Sở thích để chỉnh trọng số.

## 9. Kiểm tra nghiệm thu

- Refresh vẫn đăng nhập.
- Thêm nguồn thất bại nếu chưa kiểm tra.
- Quét một nguồn không làm nguồn khác bị dừng khi lỗi.
- Thẻ tin có ảnh/logo/placeholder.
- Tin trùng hiện nhãn nhiều nguồn.
- Từ khóa tích cực tăng điểm, từ khóa chặn ẩn bài mới.
- Mobile 390–430 px không tràn ngang; thanh dưới không che nội dung.
- Không tìm thấy chuỗi `service_role` trong `dist`:

```bash
npm run build
grep -R "service_role\|SUPABASE_SERVICE_ROLE_KEY" dist && echo "CANH BAO" || echo "OK"
```

## 10. Sao lưu

Supabase Free không thay thế chiến lược backup doanh nghiệp. Định kỳ xuất schema/data hoặc nâng gói có backup phù hợp. Không dùng ứng dụng này làm kho lưu duy nhất cho dữ liệu pháp lý quan trọng.
