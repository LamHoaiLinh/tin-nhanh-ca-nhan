# KẾT QUẢ KIỂM THỬ BẢN CUỐI

Thời điểm đóng gói: 09/07/2026, múi giờ Asia/Ho_Chi_Minh.

## Lệnh đã chạy thành công

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build
```

## Kết quả

- TypeScript typecheck: đạt.
- Vitest: 8/8 file kiểm thử đạt.
- Tổng số test: 35/35 đạt.
- Vite production build: đạt.
- Kiểm tra 9 nguồn mặc định: đủ 9, URL HTTPS duy nhất, đang bật, ưu tiên hợp lệ và tên khớp tên miền.
- Không còn URL `packages.applied-caas-gateway1.internal.api.openai.org` trong source hoặc lockfile.
- `package-lock.json` sử dụng `https://registry.npmjs.org/`.
- Không còn câu giao diện “Tin dành cho anh”; trang chính dùng “Tin dành cho bạn”.
- Bundle production tạo thành công với trang Trợ giúp, tooltip và bootstrap nguồn mặc định.

## Phạm vi unit test

- Chuẩn hóa URL và tracking parameter.
- Chuẩn hóa tiếng Việt và sanitize HTML.
- SimHash, Jaccard, cosine 3-gram và quyết định trùng.
- Chấm điểm và chọn bài đại diện.
- Trích xuất ảnh RSS.
- Chặn SSRF.
- Danh sách nguồn mặc định.

## Phần cần nghiệm thu trên hạ tầng thật

- Chạy migration mới trên Supabase.
- Render build từ commit mới và mở đúng URL production.
- Quét thực tế 9 RSS tại thời điểm triển khai.
- Kiểm tra tooltip bằng chuột và focus bàn phím.
- Kiểm tra giao diện Trợ giúp trên iPhone 14 Pro Max.
