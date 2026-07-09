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

Bản này sử dụng Edge Function:

```text
summarize-article
```

Sau khi upload GitHub, bắt buộc chạy lại workflow **Deploy Supabase Edge Functions** để cập nhật phiên bản trích xuất toàn văn nhiều tầng lên Supabase. Workflow sẽ kiểm tra Deno trước khi deploy. Không cần chạy migration SQL mới.

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
- Nút `Tóm tắt` mở chế độ đọc liên tục ngay trong ứng dụng.
- Độ dài khoảng 25–35%, cách nối câu và bố cục được xử lý hoàn toàn tự động.
- Người dùng chỉ chọn cỡ chữ, cuộn đọc, chuyển bài trước hoặc bài tiếp theo.
- Kết quả đã tóm tắt được giữ tạm trong bộ nhớ phiên để quay lại bài trước nhanh hơn.
- Khi Edge Function hoặc website nguồn tạm lỗi, giao diện tự dùng mô tả RSS thay vì hiện lỗi kỹ thuật.
- Workflow deploy nay triển khai riêng từng Edge Function và kiểm tra chắc chắn có `summarize-article`.


## Nâng cấp lấy toàn văn ổn định

Phiên bản này thay bộ lấy bài đơn giản bằng quy trình:

```text
URL gốc
→ tải bằng desktop/mobile User-Agent và theo redirect an toàn
→ JSON-LD articleBody
→ Mozilla Readability + LinkeDOM
→ selector báo Việt Nam + bộ trích xuất HTML dự phòng
→ rel=amphtml / mobile / URL AMP bảo thủ
→ RSS chỉ là phương án cuối
```

Sau khi cập nhật, cần thực hiện đủ hai việc:

1. **GitHub > Actions > Deploy Supabase Edge Functions > Run workflow** để cập nhật `summarize-article`.
2. Chờ Render deploy commit mới; khi cần dùng **Manual Deploy > Clear build cache & deploy**.

Không chạy migration SQL. Trong Supabase Edge Functions, deployment của `summarize-article` phải có thời gian cập nhật mới hơn commit này.

## Bổ sung hình trong chế độ tóm tắt
- Hiển thị hình minh họa gốc của bài báo ngay phía trên nội dung tóm tắt.
- Hình lấy từ dữ liệu bài báo đã quét, giống hình đang hiển thị trên thẻ tin.
- Nhấp vào hình sẽ mở bài báo gốc trong tab mới.
- Nếu máy chủ ảnh từ chối tải hoặc URL ảnh hỏng, khu vực hình tự ẩn để không làm gián đoạn việc đọc.
- Giao diện ảnh tự co giãn theo desktop và điện thoại.

## Cập nhật quản lý dung lượng và thứ tự tin
- Tự động xóa `scan_logs` theo số ngày cấu hình, mặc định 30 ngày.
- Workflow dọn dữ liệu kiểm tra dung lượng database sau mỗi lần chạy và tạo cảnh báo GitHub Actions từ 70%/80%.
- Giao diện có cảnh báo dung lượng và đồng hồ sử dụng trong trang Cài đặt.
- Có thể đặt giới hạn database theo gói Supabase đang dùng; mặc định 500 MB.
- Danh sách tin luôn xếp theo thời gian đăng mới nhất sau khi đã qua bộ lọc cá nhân hóa.
- Migration cần chạy: `supabase/migrations/202607090002_storage_cleanup_and_newest.sql`.


## Cập nhật tùy chọn sắp xếp và từ khóa gợi ý
1. Upload toàn bộ source mới lên GitHub.
2. Chạy migration `supabase/migrations/202607090003_sort_options.sql` đúng một lần trong Supabase SQL Editor.
3. Chờ Render build lại. Không cần deploy lại Edge Functions vì thay đổi lần này thuộc frontend và ràng buộc cài đặt.
4. Kiểm tra trang Cài đặt có ba lựa chọn sắp xếp và trang Sở thích có nút `Các từ khóa gợi ý`.

## Bổ sung câu hỏi gợi mở cuối bản tóm tắt
- Edge Function `summarize-article` tự phân tích dữ kiện, nguyên nhân, góc nhìn, tác động, khả năng triển khai và diễn biến cần theo dõi.
- Bài đủ toàn văn hiển thị 3–5 câu hỏi; bài ngắn hoặc chỉ có mô tả RSS hiển thị tối đa 1–2 câu; nội dung quá ngắn sẽ không tạo câu hỏi để tránh suy diễn.
- Không dùng mô hình AI hoặc API trả phí. Câu hỏi được sinh bằng tín hiệu ngôn ngữ, số liệu, mốc thời gian và mẫu có kiểm soát.
- Cuối cửa sổ tóm tắt có khung `Đọc sâu hơn – Câu hỏi gợi mở`, viền nổi bật, đánh số và phân loại từng câu hỏi.
- Không lưu câu hỏi hoặc toàn văn lâu dài vào database; kết quả chỉ được trả về cho phiên đọc hiện tại.
- Sau khi cập nhật GitHub phải chạy lại workflow `Deploy Supabase Edge Functions`; Render tự triển khai phần giao diện.
