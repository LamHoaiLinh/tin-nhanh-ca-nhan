# TIN NHANH CÁ NHÂN

Ứng dụng đọc RSS cá nhân bằng React, Supabase và Render. Hệ thống chuẩn hóa tiếng Việt, phát hiện tin trùng và chấm điểm theo quy tắc minh bạch, không dùng API AI trả phí.

## Điểm mới của bản cuối

- Có sẵn 9 nguồn RSS đã kiểm tra thực tế ngày 09/07/2026.
- Tự thêm nguồn còn thiếu và quét tin khi người dùng vào giao diện lần đầu.
- Toàn bộ câu giao tiếp trong ứng dụng dùng cách xưng hô **bạn**.
- Có trang **Trợ giúp** tiếng Việt hướng dẫn tìm RSS, thêm nguồn, đặt từ khóa, đọc điểm và xử lý lỗi.
- Có tooltip khi hover/focus ở các trường, nút thao tác và dấu `?`.
- Có nút **Sao chép link** và **Tóm tắt** ngay trong ứng dụng; hệ thống ưu tiên lấy toàn văn từ bài gốc bằng JSON-LD, Mozilla Readability, selector báo Việt Nam và bản AMP/mobile trước khi dùng RSS dự phòng.
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
2. Chạy các migration theo thứ tự:

```text
supabase/migrations/202607080001_initial.sql
supabase/migrations/202607090001_verified_default_sources.sql
supabase/migrations/202607090002_storage_cleanup_and_newest.sql
supabase/migrations/202607090003_sort_options.sql
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

Kết quả bản đóng gói hiện tại: 11 file kiểm thử, 50 test đạt; TypeScript và Vite production build đạt. Edge Function tiếp tục được kiểm tra trong workflow deploy Supabase.

## Bảo mật và giới hạn

- RLS bảo vệ dữ liệu từng tài khoản.
- Edge Functions tự xác thực JWT hoặc `x-cron-secret`.
- Không lưu toàn văn bài báo.
- Một số báo có thể đổi URL, chặn bot hoặc giới hạn tần suất.
- Dữ liệu RSS và hình ảnh thuộc website nguồn.

### Tóm tắt bài báo
Mỗi thẻ tin có nút `Sao chép link` và `Tóm tắt`. Tiêu đề, hình và nút `Đọc bài gốc` mở trực tiếp website của báo. Edge Function `summarize-article` thực hiện quy trình nhiều tầng:

1. Tải trực tiếp URL bài gốc bằng hồ sơ trình duyệt desktop; tự thử lại bằng hồ sơ mobile khi website chặn hoặc phản hồi lỗi tạm thời.
2. Ưu tiên `articleBody` trong JSON-LD nếu đủ dài.
3. Phân tích DOM bằng Mozilla Readability, cùng công nghệ lõi của Firefox Reader View.
4. Thử các selector nội dung phổ biến của báo Việt Nam và bộ trích xuất HTML dự phòng.
5. Phát hiện `rel=amphtml`, liên kết mobile; nếu không có thì thử một số URL AMP/mobile bảo thủ, cùng tên miền.
6. Chỉ dùng mô tả RSS khi toàn bộ các tầng trên thất bại.

Mỗi trang bị giới hạn redirect, timeout, kích thước 6 MB, kiểm tra DNS/SSRF và tổng thời gian xử lý khoảng 28 giây. Thuật toán sau đó chọn các câu quan trọng và tạo bản tóm tắt khoảng 25–35%; cách nối câu, bố cục và tỷ lệ được xử lý tự động. Giao diện đọc có ba cỡ chữ, cuộn nội dung, chuyển bài trước/bài tiếp theo và lưu tạm kết quả trong phiên. Không dùng API AI trả phí và không lưu toàn văn bài báo.

Cuối mỗi bản tóm tắt, hệ thống tạo khung `Đọc sâu hơn – Câu hỏi gợi mở`. Thuật toán phát hiện số liệu, nguyên nhân, hệ quả, góc nhìn trái chiều, kế hoạch triển khai và mốc cần theo dõi để chọn 3–5 câu hỏi cho bài đầy đủ; nội dung RSS ngắn chỉ có tối đa 1–2 câu. Nội dung quá ngắn không sinh câu hỏi nhằm hạn chế suy diễn.

## Quản lý dung lượng database
Chạy migration `202607090002_storage_cleanup_and_newest.sql` để bổ sung:
- thời gian lưu nhật ký quét;
- giới hạn database dùng cho cảnh báo;
- hàm đo dung lượng PostgreSQL;
- mặc định xếp tin theo thời gian đăng mới nhất.

Chạy thêm migration `202607090003_sort_options.sql` để cho phép ba cách sắp xếp: mới nhất, phù hợp nhất và cũ nhất.

Workflow `Cleanup Old Articles` chạy hằng ngày, xóa bài cũ chưa lưu, xóa `scan_logs` quá hạn và cảnh báo khi database đạt 70% hoặc 80% giới hạn cấu hình.


## Tùy chọn sắp xếp và từ khóa gợi ý
- Trang Cài đặt cho phép chọn `Mới nhất trước`, `Phù hợp nhất` hoặc `Cũ nhất trước`; mặc định vẫn là mới nhất.
- Trang Tin tức tự đọc lựa chọn mặc định từ `user_settings`, đồng thời Bộ lọc cho phép đổi tạm thời.
- Trang Sở thích có nút `Các từ khóa gợi ý`. Danh sách được tổ chức theo lĩnh vực bao quát; mỗi lần chỉ mở một lĩnh vực.
- Bấm một từ khóa chi tiết sẽ thêm quy tắc `Tăng điểm`, phạm vi `Tiêu đề + mô tả`, trọng số trung bình `3/10`; từ khóa đã có được nhận diện và không tạo bản ghi trùng.


## Câu hỏi gợi mở
Cuối bản tóm tắt có khung “Đọc sâu hơn”. Edge Function ưu tiên tạo câu hỏi từ toàn văn; frontend có lớp tự phục hồi để tạo câu hỏi từ bản tóm tắt khi máy chủ vẫn đang chạy phiên bản cũ hoặc payload chưa có trường `insightQuestions`.
