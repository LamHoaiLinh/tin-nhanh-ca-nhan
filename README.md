# TIN NHANH CÁ NHÂN

Ứng dụng đọc RSS cá nhân bằng React, Supabase và Render. Hệ thống chuẩn hóa tiếng Việt, phát hiện tin trùng và chấm điểm theo quy tắc minh bạch, không dùng API AI trả phí.

## Điểm mới của bản cuối

- Có sẵn 9 nguồn RSS đã kiểm tra thực tế ngày 09/07/2026.
- Tự thêm nguồn còn thiếu và quét tin khi người dùng vào giao diện lần đầu.
- Toàn bộ câu giao tiếp trong ứng dụng dùng cách xưng hô **bạn**.
- Có trang **Trợ giúp** tiếng Việt hướng dẫn tìm RSS, thêm nguồn, đặt từ khóa, đọc điểm và xử lý lỗi.
- Có tooltip khi hover/focus ở các trường, nút thao tác và dấu `?`.
- Có nút **Sao chép link** và **Tóm tắt** ngay trong ứng dụng; thuật toán giữ nguyên câu chữ cốt lõi, ưu tiên số liệu, lập luận và góc nhìn đối chiếu.
- Sửa hoàn toàn lỗi npm lockfile trỏ vào registry nội bộ; Render dùng registry công khai.
- Ghim Node bằng `.node-version` để tránh Render tự chọn phiên bản ngoài dự kiến.

## 9 nguồn mặc định

1. Báo Pháp Luật TP. Hồ Chí Minh — ưu tiên 8 — Pháp luật doanh nghiệp.
2. Dân Trí - Trang chủ — ưu tiên 7.
3. Thanh Niên - Trang chủ — ưu tiên 7.
4. VnExpress - Thời sự — ưu tiên 7.
5. Báo Giáo dục và Thời đại Online — ưu tiên 5.
6. Báo Sài Gòn Giải Phóng — ưu tiên 5.
7. VOV - Trang RSS — ưu tiên 5.
8. Sức khỏe & Đời sống - Trang RSS — ưu tiên 5.
9. Tuổi Trẻ Online - Tin mới nhất — ưu tiên 5.

Hai tên nguồn được chuẩn hóa theo đúng tên miền: URL `vnexpress.net` hiển thị là **VnExpress**, URL `vov.vn` hiển thị là **VOV**.

## Chức năng chính

- Supabase Auth email/mật khẩu, lưu phiên đăng nhập.
- Thêm, sửa, xóa, bật/tắt và kiểm tra RSS trước khi lưu.
- Tìm RSS từ website.
- Quét một nguồn, toàn bộ nguồn hoặc quét định kỳ bằng GitHub Actions.
- RSS 2.0, Atom, RDF và nhiều kiểu ảnh RSS.
- Chống SSRF, giới hạn redirect, timeout và kích thước phản hồi.
- Lọc trùng bằng URL/GUID, tiêu đề chuẩn hóa, SimHash, Jaccard và character 3-gram.
- Chấm điểm theo chuyên mục, từ khóa, nguồn, độ mới và chất lượng.
- Tìm kiếm không dấu, lọc nguồn/chuyên mục/điểm/ngày/trạng thái.
- Lưu, đã đọc, ẩn, tắt nguồn và chặn chủ đề.
- Responsive cho laptop và iPhone, có safe-area và phím tắt.

## Kiến trúc

```text
React/Vite trên Render
  ├─ Supabase Auth
  ├─ Supabase PostgREST + RLS
  └─ Supabase Edge Functions
       ├─ validate-feed
       ├─ discover-feed
       ├─ scan-rss
       └─ summarize-article

GitHub Actions
  ├─ test-build
  ├─ deploy-supabase-functions
  ├─ scan-rss định kỳ
  └─ cleanup-old-articles
```

## Triển khai mới

1. Upload toàn bộ source lên GitHub.
2. Chạy hai migration theo thứ tự:

```text
supabase/migrations/202607080001_initial.sql
supabase/migrations/202607090001_verified_default_sources.sql
```

3. Deploy bốn Edge Functions.
4. Tạo `CRON_SECRET` trên Supabase và GitHub.
5. Tạo Render Blueprint từ `render.yaml`.
6. Điền:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

7. Cập nhật Supabase Authentication Site URL theo URL Render.

## Cập nhật từ bản đang chạy

Đọc `CAP_NHAT_TU_BAN_TRUOC.md`.

## Render

```text
Node: 24.14.1
Build command: npm run build
Publish directory: ./dist
Rewrite: /* -> /index.html
```

Frontend chỉ dùng publishable key. Không đưa service-role key, secret key, access token hoặc CRON_SECRET vào Render.

## Kiểm thử

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Kết quả bản đóng gói cuối: 9 test files, 39 test cases đạt; TypeScript typecheck và Vite production build đạt.

## Bảo mật và giới hạn

- RLS bảo vệ dữ liệu từng tài khoản.
- Edge Functions tự xác thực JWT hoặc `x-cron-secret`.
- Không lưu toàn văn bài báo.
- Một số báo có thể đổi URL, chặn bot hoặc giới hạn tần suất.
- Dữ liệu RSS và hình ảnh thuộc website nguồn.

### Tóm tắt bài báo
Mỗi thẻ tin có nút `Sao chép link` và `Tóm tắt`. Tiêu đề, hình và nút `Đọc bài gốc` mở trực tiếp website của báo. Nút `Tóm tắt` gọi Edge Function `summarize-article`, lấy phần nội dung công khai của bài, trích xuất đoạn chính và tạo bản tóm tắt khoảng 25–35% bằng thuật toán chọn câu. Hệ thống ưu tiên câu có số liệu, dẫn chứng, lập luận đối chiếu và phần kết luận; các câu chuyển ý được thay đổi theo mỗi lần tạo nhưng không thêm quan điểm mới. Không dùng API AI trả phí và không lưu toàn văn bài báo.
