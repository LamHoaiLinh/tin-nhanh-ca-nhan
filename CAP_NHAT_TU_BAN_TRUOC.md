# CẬP NHẬT TỪ BẢN ĐANG CHẠY

Bản này có thể ghi đè trực tiếp lên repository GitHub hiện tại.

## 1. Upload source

1. Giải nén ZIP.
2. Trong GitHub repository, chọn **Add file > Upload files**.
3. Kéo toàn bộ file và thư mục bên trong ZIP vào thư mục gốc repository.
4. Commit trực tiếp vào nhánh `main`.
5. Render sẽ tự build lại. Nếu chưa chạy, chọn **Manual Deploy > Clear build cache & deploy**.

## 2. Chạy migration bổ sung trên Supabase

Mở file:

```text
supabase/migrations/202607090001_verified_default_sources.sql
```

Sao chép toàn bộ nội dung, dán vào **Supabase > SQL Editor > New query**, rồi bấm **Run** một lần nếu trước đây bạn chưa chạy migration này. Nếu đã chạy thành công thì không chạy lại.

Migration này:

- Đánh dấu 9 nguồn đã kiểm tra là `verified`.
- Thêm 9 nguồn vào các tài khoản hiện có nếu còn thiếu.
- Tự thêm 9 nguồn cho tài khoản tạo mới.
- Chuẩn hóa tên, website, chuyên mục, mức ưu tiên và trạng thái bật của đúng 9 URL đã xác nhận; không xóa các nguồn khác và không tạo bản trùng.

Frontend cũng có cơ chế đồng bộ 9 nguồn mặc định khi người dùng vào giao diện lần đầu, nên ứng dụng vẫn tự phục hồi nguồn mặc định nếu migration chưa kịp chạy. Tuy nhiên vẫn nên chạy migration để đồng bộ danh mục nguồn và trigger tạo tài khoản mới.

## 3. Edge Functions

Bản này thêm Edge Function mới:

```text
summarize-article
```

Sau khi upload GitHub, bắt buộc chạy lại workflow **Deploy Supabase Edge Functions** để đưa function mới lên Supabase. Không cần chạy migration SQL mới cho tính năng tóm tắt.

## 4. Kiểm tra sau cập nhật

- Trang đầu hiển thị **Tin dành cho bạn**.
- Thanh điều hướng có mục **Trợ giúp**.
- Di chuột lên dấu `?` và các nút sẽ thấy hướng dẫn.
- Trang **Nguồn tin** có đủ 9 nguồn mặc định đang bật.
- Khi vào giao diện lần đầu, banner báo đang chuẩn bị nguồn và quét tin.
- Render không còn truy cập registry npm nội bộ; Node được ghim bằng `.node-version`.

## Cập nhật sao chép link và tóm tắt nội bộ

- Tiêu đề, hình và nút `Đọc bài gốc` tiếp tục mở website của báo.
- Nút `Sao chép link` chép URL gốc vào clipboard.
- Nút `Tóm tắt` mở cửa sổ trong ứng dụng, hiển thị bản tóm tắt khoảng 25–35% bài gốc.
- Thuật toán ưu tiên số liệu, lập luận, quan điểm đối chiếu và ý nghĩa cuối bài; không thêm nhận xét cá nhân.
- Nút `Đổi cách nối câu` tạo biến thể trình bày khác nhưng giữ các ý chính.
- Phải deploy lại Edge Functions sau khi cập nhật source.
