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
