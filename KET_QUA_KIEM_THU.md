# KẾT QUẢ KIỂM THỬ

Thời điểm đóng gói: 08/07/2026, múi giờ Asia/Ho_Chi_Minh.

## Các lệnh đã chạy thành công

```bash
npm run typecheck
npm test
npm run build
npx -y deno@latest check \
  supabase/functions/validate-feed/index.ts \
  supabase/functions/discover-feed/index.ts \
  supabase/functions/scan-rss/index.ts
```

## Kết quả

- TypeScript strict typecheck: đạt.
- Vitest: 7/7 test files đạt, 31/31 test cases đạt.
- Vite production build: đạt.
- Kiểm tra kiểu Deno cho cả 3 Edge Function: đạt.
- Bundle frontend không chứa `SUPABASE_SERVICE_ROLE_KEY` hoặc chuỗi `service_role`.
- Mã thực thi không chứa OpenAI, Gemini, Claude, Anthropic, embedding hoặc LLM.
- Không phát hiện khóa bí mật thật bị hard-code trong source, workflow hoặc bundle.

## Phạm vi unit test

- Chuẩn hóa URL và xóa tracking parameter.
- Chuẩn hóa tiêu đề tiếng Việt, tìm kiếm không dấu và sanitize HTML.
- Jaccard, character 3-gram cosine, SimHash 64-bit và Hamming Distance.
- Quyết định tin trùng và chọn bài đại diện.
- Điểm chuyên mục, từ khóa, nguồn, độ mới và chất lượng.
- Trích xuất ảnh từ các trường RSS.
- Chặn URL localhost, loopback, private IP và metadata endpoint dạng literal.

## Phần phải nghiệm thu sau khi triển khai thật

- Kết nối project Supabase và chạy migration trên hạ tầng thật.
- Deploy, cấu hình secrets và gọi Edge Functions từ Supabase/GitHub Actions.
- Khả năng phản hồi của từng RSS tại thời điểm triển khai; một số báo có thể đổi URL hoặc chặn bot.
- Kiểm thử trực tiếp trên iPhone 14 Pro Max và các trình duyệt mục tiêu.
- Kiểm thử tải với số nguồn/bài thực tế và tinh chỉnh ngưỡng lọc trùng.

Thực hiện checklist trong `HUONG_DAN_TRIEN_KHAI.md` trước khi đưa vào sử dụng chính thức.
