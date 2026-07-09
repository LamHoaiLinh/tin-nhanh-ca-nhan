# KIẾN TRÚC VÀ THUẬT TOÁN

## Luồng quét

```text
Nguồn RSS
  → kiểm tra URL/SSRF
  → fetch có timeout, redirect và byte limit
  → parse RSS/Atom/RDF
  → sanitize title/description
  → canonical URL + SHA-256
  → normalized title tiếng Việt
  → SimHash 64-bit
  → tìm ứng viên 7 ngày gần nhất
  → quyết định trùng
  → chọn đại diện
  → chấm điểm theo người dùng
  → lưu PostgreSQL
```

## Chuẩn hóa URL

- Chỉ HTTP/HTTPS.
- Host chữ thường, bỏ `www.`.
- Bỏ fragment và slash cuối.
- Xóa đúng danh sách tracking parameter.
- Giữ query khác vì có thể thay đổi bài.
- Sắp xếp query theo key/value.
- SHA-256 canonical URL.

## Chuẩn hóa tiêu đề

- NFKC, chữ thường, `đ → d`, bỏ dấu.
- Decode entity, bỏ HTML, emoji, dấu câu và khoảng trắng thừa.
- Bỏ tiền tố tin lặp.
- Stopword được giữ ở mức thận trọng; không loại từ `tu` vì có thể là “tử” trong “điện tử”.
- Số văn bản và ngày tháng được giữ lại.

## Quyết định trùng

```text
Trùng = URL/GUID giống
     OR normalized title giống trong 7 ngày
     OR (Hamming ≤ 3 AND Jaccard ≥ 0,82 AND ≥5 token)
     OR (Jaccard ≥ 0,90 AND ≥5 token)
     OR (3-gram cosine ≥ 0,92 AND trong 24 giờ)
```

Ứng viên được giới hạn theo thời gian để giảm chi phí. Không so toàn bộ lịch sử.

## Chọn đại diện

```text
30 × priority/10
+ 20 nếu có ảnh
+ min(20, descriptionLength/20)
+ tối đa 15 cho bài đăng sớm
+ 10 cho URL/ngày hợp lệ
+ 5 nếu có tác giả
```

Nếu bài mới có điểm đại diện cao hơn, cluster được chuyển sang đại diện mới. Unique index và workflow concurrency hạn chế insert lặp.

## Chấm điểm

- Chuyên mục: `weight/10 × 25`.
- Từ khóa title: `weight × 3`.
- Từ khóa description: `weight × 1`.
- Cụm từ: thưởng 20%.
- Nguồn: `priority/10 × 15`.
- Độ mới: `20 × exp(-ageHours/halfLifeHours)`.
- Chất lượng: ảnh, mô tả, ngày, tác giả, HTTPS, không giật gân.
- Từ khóa âm: title `weight × 5`, description `weight × 2`.
- Điểm clamp 0–100.

## Hiệu năng

- Query phân trang `range` phía Supabase.
- Index theo source, published_at, URL hash, title hash, duplicate_of.
- Tìm kiếm dùng `search_text` đã bỏ dấu.
- UI dùng React Query và giữ dữ liệu cũ khi đổi trang.
- Ảnh lazy loading.

## Điểm mù kỹ thuật

- SimHash từ feed description không tương đương phân tích toàn văn.
- Character n-gram có thể nhầm hai tiêu đề dùng mẫu câu giống nhau.
- Nguồn đăng lại bài cũ với ngày mới có thể qua bộ lọc thời gian.
- RSS thiếu GUID/ngày làm chất lượng nhận dạng giảm.
- Chọn đại diện lại chưa gói trong PostgreSQL transaction/RPC duy nhất.


## Luồng tóm tắt bài báo

```text
Người dùng bấm Tóm tắt
  → xác thực tài khoản và quyền sở hữu nguồn
  → kiểm tra URL/SSRF ở mỗi lần chuyển hướng
  → tải tối đa 5 MB, timeout 15 giây
  → ưu tiên articleBody trong JSON-LD
  → nếu thiếu, lấy các đoạn trong article/main/p
  → loại quảng cáo, điều hướng, “xem thêm” và đoạn trùng
  → tách câu tiếng Việt bằng Intl.Segmenter
  → chấm điểm theo tần suất từ, tiêu đề, vị trí, số liệu, dẫn chứng, đối chiếu và phần kết
  → chọn câu bằng ngưỡng đa dạng Jaccard
  → sắp lại theo thứ tự bài gốc
  → thêm câu chuyển ý trung tính theo quan hệ ngữ nghĩa
  → trả bản tóm tắt khoảng 25–35%
```

Thuật toán là extractive: giữ nguyên phần lớn câu gốc để hạn chế bịa thêm ý và bảo toàn giọng điệu. Câu chuyển ý chỉ làm nhiệm vụ nối mạch; không tạo kết luận mới. Toàn văn chỉ được xử lý trong bộ nhớ Edge Function và không lưu vào database.

## Giới hạn tóm tắt

- Một số báo chặn bot, yêu cầu JavaScript hoặc trả trang quá lớn; khi đó hệ thống dùng mô tả RSS và hiển thị cảnh báo.
- Tóm tắt extractive có thể kém tự nhiên hơn mô hình ngôn ngữ, nhưng chi phí bằng 0 và khả năng kiểm chứng cao hơn.
- Các bài pháp luật, y tế, tài chính hoặc có số liệu quan trọng vẫn cần đối chiếu nguồn gốc.


## Trích xuất toàn văn cho tóm tắt

Edge Function `summarize-article` tách việc tải trang và phân tích nội dung thành hai lớp:

- `_shared/article-source.ts`: tải HTTP an toàn, retry desktop/mobile, redirect, encoding, giới hạn dung lượng và tổng thời gian; tìm và thử URL AMP/mobile.
- `_shared/article-extractor.ts`: JSON-LD, Mozilla Readability trên LinkeDOM, selector báo Việt Nam, chấm chất lượng nội dung và loại đoạn nhiễu.

Tiêu chí nhận toàn văn không chỉ dựa vào số ký tự: hệ thống kết hợp số từ, số đoạn, độ phủ từ khóa tiêu đề và độ dài tương đối so với mô tả RSS. Việc này giảm hai lỗi phổ biến: lấy nhầm cột tin liên quan và coi sapo ngắn là toàn văn.
