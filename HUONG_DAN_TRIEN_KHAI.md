# HƯỚNG DẪN TRIỂN KHAI

## A. Tạo mới hoàn toàn

### 1. GitHub

Upload toàn bộ nội dung dự án vào thư mục gốc repository. Các thư mục `.github`, `src`, `supabase` phải nằm cùng cấp với `package.json` và `render.yaml`.

### 2. Supabase Database

Trong SQL Editor, chạy lần lượt:

```text
supabase/migrations/202607080001_initial.sql
supabase/migrations/202607090001_verified_default_sources.sql
supabase/migrations/202607090002_storage_cleanup_and_newest.sql
supabase/migrations/202607090003_sort_options.sql
```

Migration thứ hai tạo danh mục 9 nguồn đã xác nhận; migration thứ ba bổ sung quản lý dung lượng; migration thứ tư mở rộng tùy chọn sắp xếp.

### 3. Edge Functions

Chạy workflow GitHub **Deploy Supabase Edge Functions** hoặc dùng CLI:

```bash
supabase functions deploy validate-feed
supabase functions deploy discover-feed
supabase functions deploy scan-rss
supabase functions deploy summarize-article
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
- Nút Tóm tắt tạo được nội dung và nút Sao chép link hoạt động.

## B. Cập nhật repository hiện tại

Đọc `CAP_NHAT_TU_BAN_TRUOC.md`. Điểm bắt buộc là chạy migration `202607090001_verified_default_sources.sql` một lần và để Render build lại commit mới.

## C. Xử lý lỗi Render npm ETIMEDOUT

Bản cuối đã loại bỏ mọi URL registry nội bộ khỏi `package-lock.json` và `deno.lock`. Nếu Render còn dùng cache cũ:

```text
Manual Deploy > Clear build cache & deploy
```

Log đúng phải tải package từ `https://registry.npmjs.org/`.

## Cập nhật quản lý dung lượng
Sau khi upload phiên bản này, chạy thêm migration:

`supabase/migrations/202607090002_storage_cleanup_and_newest.sql`

Migration bổ sung thời gian giữ `scan_logs`, giới hạn database dùng cho cảnh báo, hàm đọc dung lượng PostgreSQL và đặt thứ tự tin mặc định là mới nhất.

Sau đó vào GitHub Actions chạy thủ công `Cleanup Old Articles` một lần để xác nhận bài cũ, nhật ký quét và cảnh báo dung lượng hoạt động. Workflow cần `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`.


## Cập nhật sắp xếp và từ khóa gợi ý
Sau khi upload phiên bản này, chạy thêm migration:

`supabase/migrations/202607090003_sort_options.sql`

Migration mở rộng ràng buộc `default_sort` để hỗ trợ `newest`, `relevance` và `oldest`. Sau khi Render triển khai xong, chọn thứ tự mặc định trong Cài đặt. Từ khóa gợi ý không cần migration riêng vì chúng được thêm vào bảng `keyword_rules` khi người dùng bấm chọn.


## Triển khai cập nhật câu hỏi gợi mở
1. Upload toàn bộ source mới lên GitHub và commit vào nhánh `main`.
2. Vào `GitHub > Actions > Deploy Supabase Edge Functions > Run workflow` để cập nhật `summarize-article`.
3. Chờ Render tự build frontend; khi cần chọn `Manual Deploy > Clear build cache & deploy`.
4. Không có migration SQL mới cho tính năng này.
5. Mở một bài đủ dài, cuộn xuống cuối bản tóm tắt và kiểm tra khung `Đọc sâu hơn – Câu hỏi gợi mở`.
