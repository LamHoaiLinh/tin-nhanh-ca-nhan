# KẾT QUẢ KIỂM THỬ BẢN CUỐI

Thời điểm đóng gói: 09/07/2026, múi giờ Asia/Ho_Chi_Minh.

## Lệnh đã chạy thành công

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build
npx -y deno@2.5.6 check --config supabase/functions/summarize-article/deno.json supabase/functions/summarize-article/index.ts
```

## Kết quả

- TypeScript typecheck: đạt.
- Vitest: 9/9 file kiểm thử đạt.
- Tổng số test: 42/42 đạt.
- Vite production build: đạt.
- Deno typecheck cho Edge Function `summarize-article`: đạt.
- Kiểm tra 9 nguồn mặc định: đủ 9, URL HTTPS duy nhất, đang bật, ưu tiên hợp lệ và tên khớp tên miền.
- Không còn địa chỉ npm registry nội bộ trong `package-lock.json` hoặc các Deno lockfile.
- `package-lock.json` sử dụng `https://registry.npmjs.org/`.
- Không còn câu giao diện “Tin dành cho anh”; trang chính dùng “Tin dành cho bạn”.
- Bundle production tạo thành công với trang Trợ giúp, tooltip và bootstrap nguồn mặc định.
- Tiêu đề, hình và nút Đọc bài gốc đều mở URL gốc của báo trong tab mới.
- Nút Sao chép link dùng URL bài gốc; nút Tóm tắt gọi Edge Function nội bộ, không dùng TLDR hoặc API AI trả phí.
- Thuật toán tóm tắt đã kiểm thử JSON-LD, Mozilla Readability, selector nội dung, phát hiện AMP/mobile, loại nhiễu, giữ thứ tự logic, tỷ lệ gần 30% và biến đổi câu chuyển ý theo seed.

## Phạm vi unit test

- Chuẩn hóa URL và tracking parameter.
- Chuẩn hóa tiếng Việt và sanitize HTML.
- SimHash, Jaccard, cosine 3-gram và quyết định trùng.
- Chấm điểm và chọn bài đại diện.
- Trích xuất ảnh RSS.
- Chặn SSRF.
- Danh sách nguồn mặc định.
- Trích xuất nội dung nhiều tầng, phát hiện AMP/mobile và tóm tắt bài báo.

## Phần cần nghiệm thu trên hạ tầng thật

- Không có migration SQL mới cho tính năng này; cần deploy Edge Function `summarize-article`.
- Render build từ commit mới và mở đúng URL production.
- Quét thực tế 9 RSS tại thời điểm triển khai.
- Kiểm tra tooltip bằng chuột và focus bàn phím.
- Kiểm tra giao diện Trợ giúp trên iPhone 14 Pro Max.

## Bổ sung quản lý dung lượng
- TypeScript typecheck: đạt.
- Vitest: 11/11 file, 47/47 test đạt.
- Production build: đạt.
- Kiểm thử mới: phân mức cảnh báo 70%/80% và định dạng dung lượng.
- Danh sách bài mặc định xếp theo `published_at DESC`, đồng thời hỗ trợ sắp xếp theo điểm phù hợp hoặc thời gian cũ nhất.


## Bổ sung tùy chọn sắp xếp và từ khóa gợi ý
- TypeScript typecheck: đạt.
- Vitest: 11/11 file, 47/47 test đạt.
- Production build: đạt.
- Kiểm thử mới xác nhận mới nhất là mặc định, đủ ba chế độ sắp xếp, trọng số gợi ý là 3/10 và danh mục gợi ý không có từ khóa trùng trong cùng nhóm.
