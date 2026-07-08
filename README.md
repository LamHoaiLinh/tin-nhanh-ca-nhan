# TIN NHANH CÁ NHÂN

Ứng dụng đọc RSS cá nhân bằng React + Supabase. Hệ thống chuẩn hóa URL và tiếng Việt, gom tin trùng, chọn bài đại diện và chấm điểm theo chuyên mục/từ khóa bằng thuật toán xác định. Không gọi OpenAI, Gemini, Claude, embedding hoặc API AI nào.

## Chức năng đã có

- Đăng ký, đăng nhập email/mật khẩu bằng Supabase Auth; phiên được lưu sau khi refresh.
- Thêm, sửa, xóa, bật/tắt nguồn RSS; kiểm tra feed trước khi lưu.
- Dò RSS từ URL website qua `link rel="alternate"` và các đường dẫn phổ biến.
- Quét một nguồn hoặc toàn bộ nguồn; GitHub Actions quét phút 17 và 47 mỗi giờ.
- Hỗ trợ RSS 2.0, Atom và RDF; đọc ảnh từ Media RSS, enclosure, content hoặc description.
- Chống SSRF, giới hạn redirect, timeout 10 giây và phản hồi 2 MB.
- Lọc trùng nhiều tầng: URL/GUID, normalized title, SimHash, Jaccard và character 3-gram.
- Chọn bài đại diện theo ưu tiên nguồn, ảnh, mô tả, thời điểm đăng, URL/ngày và tác giả.
- Chấm điểm 0–100 theo chuyên mục, từ khóa, nguồn, độ mới và chất lượng dữ liệu.
- Tìm kiếm không dấu, lọc trạng thái/chuyên mục/nguồn/điểm/ngày, phân trang phía server.
- Lưu, đã đọc, ẩn, tắt nguồn, chặn chủ đề; xem các nguồn khác cùng đăng.
- Thanh điều hướng cố định phía dưới, hỗ trợ safe area iPhone và phím tắt laptop.
- Script dọn bài quá hạn nhưng giữ bài đã lưu.

## Kiến trúc

```text
Trình duyệt React
  ├─ Supabase Auth
  ├─ Supabase PostgREST + RLS
  └─ Supabase Edge Functions
       ├─ validate-feed
       ├─ discover-feed
       └─ scan-rss
            └─ Website RSS bên ngoài

GitHub Actions
  ├─ Test + Build
  ├─ Quét RSS định kỳ
  └─ Dọn bài cũ hằng ngày

Render Static Site
  └─ dist/ của Vite
```

Không có backend Render riêng. Service role chỉ dùng trong Edge Function hoặc workflow dọn dữ liệu; frontend chỉ dùng publishable key.

## Chạy local

### Cách nhanh trên Windows

1. Cài Node.js 22 LTS hoặc mới hơn.
2. Nhấp đúp `run_local.bat`.
3. Mở `.env.local`, điền hai biến Supabase.
4. Chạy lại `run_local.bat`.

### Dùng terminal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mặc định Vite chạy tại `http://localhost:5173`.

## Biến môi trường

Frontend (`.env.local` và Render):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Supabase Edge Function secrets:

```env
CRON_SECRET=chuoi-ngau-nhien-dai-it-nhat-32-ky-tu
```

Các biến `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` được Supabase cung cấp cho Edge Functions. Không đưa service role vào frontend.

GitHub repository secrets:

```text
SUPABASE_URL
CRON_SECRET
SUPABASE_SERVICE_ROLE_KEY   # chỉ workflow cleanup
```

## Tạo Supabase

1. Tạo project mới, chọn region gần Việt Nam.
2. Cài Supabase CLI và đăng nhập:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

3. Chạy migration:

```bash
supabase db push
```

4. Deploy ba Edge Functions:

```bash
supabase functions deploy validate-feed
supabase functions deploy discover-feed
supabase functions deploy scan-rss
```

5. Tạo secret:

```bash
supabase secrets set CRON_SECRET="chuoi-ngau-nhien-dai-it-nhat-32-ky-tu"
```

6. Trong Authentication > URL Configuration, thêm URL local và URL Render vào Redirect URLs.

## Tài khoản đầu tiên

Phải chạy migration trước, sau đó mở website và chọn **Tạo tài khoản**. Trigger `handle_new_user` tự tạo profile, cài đặt, trọng số chuyên mục và từ khóa mẫu. Không có tài khoản quản trị hard-code.

Nếu bật Confirm email trong Supabase Auth, người dùng phải bấm link xác nhận trước khi đăng nhập.

## Deploy Render

### Dùng Blueprint

1. Push dự án lên GitHub.
2. Trên Render chọn **New > Blueprint** và chọn repository.
3. Render đọc `render.yaml`.
4. Điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Deploy.

Cấu hình dùng:

```text
Build command: npm ci && npm run build
Publish directory: dist
Rewrite: /* -> /index.html
```

Rewrite bắt buộc để React Router không lỗi 404 khi refresh trang con.

## GitHub Actions

Tạo repository secrets như phần trên. Workflow `scan-rss.yml` gọi Edge Function bằng header `x-cron-secret` vào phút 17 và 47 mỗi giờ. `concurrency` ngăn hai lần quét chạy chồng.

Nếu lịch không chạy:

- Repository phải có workflow trên nhánh mặc định.
- GitHub có thể trì hoãn workflow theo tải hệ thống.
- Kiểm tra Actions có bị tắt do repository lâu không hoạt động.
- Chạy `workflow_dispatch` thủ công để xác nhận secret và endpoint.
- Xem lỗi HTTP trả về từ bước `curl`.

## Thêm RSS

1. Vào **Nguồn tin**.
2. Dán URL RSS hoặc URL website.
3. Bấm **Kiểm tra RSS** hoặc **Tìm RSS từ website**.
4. Chỉ khi kết quả hợp lệ mới bấm **Lưu nguồn**.
5. Bấm **Quét ngay**.

Danh mục nguồn gợi ý chỉ là điểm khởi đầu. Vì URL báo chí có thể thay đổi, mọi nguồn đều được kiểm tra runtime trước khi thêm; không tự kích hoạt URL chưa xác minh.

## Thuật toán lọc trùng

1. Trùng tuyệt đối: GUID cùng nguồn, canonical URL, URL hash hoặc normalized title trong 7 ngày.
2. Ứng viên gần: bài trong 72 giờ.
3. SimHash 64-bit: Hamming Distance ≤ 3.
4. Jaccard token tiêu đề: ≥ 0,82, tối thiểu 5 token có nghĩa.
5. Character 3-gram cosine: ngưỡng 0,92 trong cùng ngày.
6. Không kết luận chỉ từ các từ chung như “thuế”, “doanh nghiệp”, “tai nạn”.
7. Bản trùng không bị xóa; trường `duplicate_of` trỏ về bài đại diện.

Chi tiết tại `KIEN_TRUC_VA_THUAT_TOAN.md`.

## Chấm điểm

```text
Điểm = chuyên mục + từ khóa tích cực + nguồn + độ mới + chất lượng - từ khóa tiêu cực
```

- Chuyên mục tối đa 25.
- Từ khóa tích cực tối đa 30.
- Nguồn tối đa 15.
- Độ mới tối đa 20, suy giảm mũ theo half-life.
- Chất lượng tối đa 10.
- Từ khóa âm trọng số 100 được xem là chặn tuyệt đối.

Thay đổi trọng số trong trang **Sở thích**. Tin đã lưu không bị script dọn tự động xóa.

## Kiểm thử và build

```bash
npm test
npm run typecheck
npm run build
```

Kết quả tại thời điểm đóng gói: 7 test files, 31 tests đều đạt; TypeScript strict và Vite production build đạt.

## Giới hạn hiện tại

- Một số báo chặn bot, Cloudflare hoặc yêu cầu cookie; hệ thống sẽ báo lỗi thay vì vượt cơ chế bảo vệ.
- Feed có XML sai nghiêm trọng hoặc encoding rất hiếm có thể không đọc được.
- Dò feed chỉ đọc HTML tĩnh; không chạy JavaScript website.
- Lọc trùng dựa trên tiêu đề/mô tả RSS nên có thể bỏ sót khi hai báo viết tiêu đề quá khác nhau.
- Việc đổi bài đại diện gồm nhiều truy vấn, không phải một transaction PostgreSQL duy nhất; chạy chồng đã được giảm bằng GitHub concurrency và unique index.
- Gói miễn phí Supabase/Render/GitHub có quota và có thể sleep hoặc trì hoãn.
- Ảnh được tải trực tiếp từ báo; báo có thể chặn hotlink hoặc đổi URL.

## Bảo mật

- RLS bật cho toàn bộ dữ liệu người dùng.
- Không có service role trong bundle frontend.
- URL nhập vào được chặn localhost, private IP, metadata endpoint và credential trong URL.
- Redirect được kiểm tra lại từng bước.
- Không render HTML RSS; mô tả được strip/sanitize thành text.
- Không lưu toàn văn bài báo.

## Giấy phép và nội dung báo chí

Source code có thể dùng nội bộ. Nội dung, ảnh và nhãn hiệu của báo thuộc chủ sở hữu tương ứng. Ứng dụng chỉ lưu dữ liệu được feed cung cấp và mở bài đầy đủ trên website gốc.
