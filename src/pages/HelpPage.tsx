import { Link } from 'react-router-dom';

export function HelpPage() {
  return (
    <div className="stack-page help-page">
      <section className="page-heading">
        <div>
          <h1>Trợ giúp sử dụng</h1>
          <p>Hướng dẫn nhanh để bạn thêm nguồn RSS, đặt từ khóa và đọc tin hiệu quả.</p>
        </div>
        <Link className="button primary" to="/">Về trang tin</Link>
      </section>

      <section className="panel help-quick-start">
        <h2>Bắt đầu trong 3 bước</h2>
        <ol>
          <li><strong>Kiểm tra nguồn:</strong> vào <Link to="/sources">Nguồn tin</Link>, dán URL RSS hoặc địa chỉ trang báo, sau đó bấm <em>Kiểm tra RSS</em>.</li>
          <li><strong>Đặt chủ đề quan trọng:</strong> vào <Link to="/rules">Sở thích</Link>, thêm từ khóa và chọn cách tăng điểm, giảm điểm hoặc bắt buộc.</li>
          <li><strong>Quét và đọc:</strong> về trang Tin tức, bấm <em>Quét ngay</em>, sau đó dùng Bộ lọc để chọn nguồn, chuyên mục hoặc mức điểm.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Cách tìm nguồn RSS của một báo</h2>
        <ol>
          <li>Mở trang báo cần theo dõi và tìm các chữ <strong>RSS</strong>, <strong>Feed</strong> hoặc biểu tượng sóng RSS ở đầu hay cuối trang.</li>
          <li>Nếu đã có đường dẫn RSS, sao chép đường dẫn đó vào ô <strong>URL RSS hoặc website</strong>.</li>
          <li>Nếu chỉ có địa chỉ website, dán trang chủ rồi bấm <strong>Tìm RSS từ website</strong>. Hệ thống sẽ dò các thẻ RSS/Atom công khai.</li>
          <li>Luôn bấm <strong>Kiểm tra RSS</strong> trước khi lưu. Kết quả hợp lệ phải đọc được tên feed, số bài thử và ngày bài mới nhất.</li>
          <li>Chọn mức ưu tiên từ 1 đến 10. Nguồn càng quan trọng nên đặt điểm càng cao.</li>
        </ol>
        <p className="help-note">Một số báo chặn máy chủ hoặc đổi URL RSS. Khi đó hãy thử feed chuyên mục khác hoặc kiểm tra lại sau.</p>
      </section>

      <section className="panel">
        <h2>Cách đặt từ khóa quan trọng</h2>
        <div className="help-grid">
          <article>
            <h3>Tăng điểm</h3>
            <p>Dùng cho chủ đề bạn muốn ưu tiên, ví dụ: <em>hóa đơn điện tử</em>, <em>thuế</em>, <em>đào tạo lái xe</em>. Từ khóa xuất hiện trong tiêu đề được cộng điểm nhiều hơn mô tả.</p>
          </article>
          <article>
            <h3>Giảm điểm</h3>
            <p>Dùng cho nội dung ít quan tâm. Trọng số càng cao, bài càng bị đẩy xuống. Mức 100 có thể dùng để chặn chủ đề ở các lần quét sau.</p>
          </article>
          <article>
            <h3>Bắt buộc</h3>
            <p>Chỉ nên dùng khi bạn muốn bài phải chứa một cụm từ cụ thể. Đặt quá nhiều từ khóa bắt buộc có thể làm danh sách gần như trống.</p>
          </article>
        </div>
        <p><strong>Gợi ý thực tế:</strong> bắt đầu với 5–10 từ khóa tăng điểm, trọng số 3–6. Theo dõi vài ngày rồi mới tăng hoặc giảm mạnh.</p>
      </section>

      <section className="panel">
        <h2>Đọc bài gốc và tóm tắt nhanh</h2>
        <ul>
          <li><strong>Bấm vào tiêu đề hoặc hình bài báo:</strong> mở thẳng bài gốc trên website của báo trong tab mới.</li>
          <li><strong>Nút Tóm tắt:</strong> tự sao chép link bài báo và mở TLDR This trong tab mới.</li>
          <li>Tại TLDR This, chọn <strong>Add URL</strong>, dán liên kết vừa sao chép rồi bấm <strong>Summarize This</strong>.</li>
          <li>Nếu trình duyệt chặn tab mới, hãy cho phép mở cửa sổ bật lên đối với website Tin Nhanh Cá Nhân rồi thử lại.</li>
        </ul>
        <p className="help-note">TLDR This là dịch vụ bên thứ ba. Bản tóm tắt chỉ dùng để đọc nhanh; với số liệu, pháp luật hoặc thông tin quan trọng, bạn nên kiểm tra lại bài báo gốc.</p>
      </section>

      <section className="panel">
        <h2>Điểm phù hợp được tính như thế nào?</h2>
        <p>Điểm tổng hợp từ trọng số chuyên mục, từ khóa, độ ưu tiên của nguồn, độ mới và chất lượng dữ liệu. Di chuột lên nhãn điểm của mỗi bài để xem chi tiết từng thành phần.</p>
        <ul>
          <li><strong>Điểm cao:</strong> phù hợp hơn với sở thích hiện tại.</li>
          <li><strong>Nguồn cùng đăng:</strong> hệ thống đã nhận ra nhiều bài gần giống và chỉ chọn một bài đại diện.</li>
          <li><strong>Ẩn:</strong> chỉ ẩn bài hiện tại.</li>
          <li><strong>Tắt nguồn:</strong> ngừng lấy toàn bộ bài mới từ nguồn đó.</li>
          <li><strong>Chặn chủ đề:</strong> tạo quy tắc giảm điểm mạnh cho từ khóa đã chọn.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Quét tin và xử lý lỗi</h2>
        <ul>
          <li>Ứng dụng tự thêm các nguồn mặc định đã kiểm tra và thực hiện quét khi bạn vào giao diện lần đầu.</li>
          <li>Nút <strong>Quét ngay</strong> lấy tin từ toàn bộ nguồn đang bật; nút cạnh từng nguồn chỉ quét nguồn đó.</li>
          <li>Nếu báo lỗi 403/429, nguồn có thể đang chặn truy cập hoặc giới hạn tần suất. Chờ rồi thử lại.</li>
          <li>Nếu không có bài mới, kiểm tra nguồn đang bật, URL RSS còn hoạt động và bộ lọc điểm tối thiểu không đặt quá cao.</li>
          <li>Nếu tin không đúng sở thích, điều chỉnh từ khóa và trọng số chuyên mục thay vì xóa toàn bộ nguồn.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Quy trình đề xuất</h2>
        <p>Quét tin → xem 20–30 bài → lưu bài hữu ích → chặn chủ đề nhiễu → điều chỉnh từ khóa mỗi tuần. Cách này giúp bộ lọc ngày càng sát nhu cầu mà không cần dùng dịch vụ AI trả phí.</p>
      </section>
    </div>
  );
}
