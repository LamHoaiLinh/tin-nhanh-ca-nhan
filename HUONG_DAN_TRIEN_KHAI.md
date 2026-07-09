# HƯỚNG DẪN TRIỂN KHAI

## A. Tạo mới hoàn toàn

### 1. GitHub

Upload toàn bộ nội dung dự án vào thư mục gốc repository. Các thư mục `.github`, `src`, `supabase` phải nằm cùng cấp với `package.json` và `render.yaml`.

### 2. Supabase Database

Trong SQL Editor, chạy lần lượt:

```text
supabase/migrations/202607080001_initial.sql
supabase/migrations/202607090001_verified_default_sources.sql
```

Migration thứ hai tạo danh mục 9 nguồn đã xác nhận, thêm nguồn cho tài khoản hiện có và cập nhật trigger cho tài khoản mới.

### 3. Edge Functions

Chạy workflow GitHub **Deploy Supabase Edge Functions** hoặc dùng CLI:

```bash
supabase functions deploy validate-feed
supabase functions deploy discover-feed
supabase functions deploy scan-rss
```

Supabase Edge Function secret:

```text
CRON_SECRET
```

### 4. GitHub Secrets

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
SUPABASE_URL
CRON_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_ACCESS_TOKEN` phải là Personal Access Token dạng `sbp_...`. `SUPABASE_PROJECT_ID` là Reference ID, không phải URL.

### 5. Render

Tạo **New > Blueprint**, chọn repository và `render.yaml`.

Điền:

```text
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Không điền service role, secret key, access token hoặc CRON_SECRET vào Render.

Render sử dụng:

```text
Node 24.14.1
Build: npm run build
Publish: ./dist
```

### 6. Authentication URL

Sau khi Render báo Live, vào Supabase:

```text
Authentication > URL Configuration
```

Điền URL Render vào Site URL và thêm:

```text
https://TEN-APP.onrender.com/**
```

### 7. Kiểm tra

- Đăng nhập được và refresh vẫn giữ phiên.
- 9 nguồn mặc định xuất hiện trong Nguồn tin.
- Banner quét lần đầu xuất hiện khi vào ứng dụng.
- Trang Trợ giúp mở được.
- Workflow Scan RSS chạy xanh.

## B. Cập nhật repository hiện tại

Đọc `CAP_NHAT_TU_BAN_TRUOC.md`. Điểm bắt buộc là chạy migration `202607090001_verified_default_sources.sql` một lần và để Render build lại commit mới.

## C. Xử lý lỗi Render npm ETIMEDOUT

Bản cuối đã loại bỏ mọi URL registry nội bộ khỏi `package-lock.json` và `deno.lock`. Nếu Render còn dùng cache cũ:

```text
Manual Deploy > Clear build cache & deploy
```

Log đúng phải tải package từ `https://registry.npmjs.org/`.
