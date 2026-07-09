import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HelpTip } from '../components/HelpTip';
import { supabase } from '../services/supabase';
import type { UserSettings } from '../types/domain';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../utils/error';

export function SettingsPage() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (query.data) setSettings(query.data);
  }, [query.data]);

  async function save() {
    if (!user || !settings) return;
    const { error } = await supabase.from('user_settings').upsert({ ...settings, user_id: user.id });
    setMessage(error ? errorMessage(error) : 'Đã lưu cài đặt.');
  }

  if (!settings) return <div className="center-screen">Đang tải cài đặt…</div>;

  return (
    <div className="stack-page">
      <section className="page-heading">
        <div>
          <h1>Cài đặt</h1>
          <p>Các thông số ảnh hưởng đến phân trang, thời gian lưu và hiển thị.</p>
        </div>
        <Link className="button" to="/help" title="Mở hướng dẫn sử dụng chi tiết">Trợ giúp</Link>
      </section>

      <section className="panel settings-form">
        <label>
          <span className="label-with-tip">Số bài mỗi trang <HelpTip text="Số nhỏ tải nhanh hơn trên điện thoại; số lớn phù hợp khi đọc trên laptop." /></span>
          <select value={settings.page_size} onChange={(event) => setSettings({ ...settings, page_size: Number(event.target.value) })}>
            {[10, 20, 30, 50].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span className="label-with-tip">Giữ bài trong bao nhiêu ngày <HelpTip text="Bài cũ chưa lưu sẽ được dọn theo thời hạn này để giảm dữ liệu." /></span>
          <input type="number" min="7" max="365" value={settings.article_retention_days} onChange={(event) => setSettings({ ...settings, article_retention_days: Number(event.target.value) })} />
        </label>
        <label>
          <span className="label-with-tip">Khoảng quét mong muốn (phút) <HelpTip text="Thông số tham chiếu cho lịch quét. GitHub Actions hiện quét khoảng hai lần mỗi giờ." /></span>
          <input type="number" min="15" max="1440" value={settings.scan_interval_minutes} onChange={(event) => setSettings({ ...settings, scan_interval_minutes: Number(event.target.value) })} />
        </label>
        <label>
          <span className="label-with-tip">Sắp xếp mặc định <HelpTip text="Phù hợp nhất ưu tiên điểm cá nhân hóa; Mới nhất ưu tiên thời gian đăng." /></span>
          <select value={settings.default_sort} onChange={(event) => setSettings({ ...settings, default_sort: event.target.value as UserSettings['default_sort'] })}>
            <option value="relevance">Phù hợp nhất</option>
            <option value="newest">Mới nhất</option>
          </select>
        </label>
        <label>
          <span className="label-with-tip">Ảnh dự phòng <HelpTip text="Dùng logo nguồn hoặc ảnh chuyên mục khi RSS không cung cấp ảnh bài viết." /></span>
          <select value={settings.image_fallback_mode} onChange={(event) => setSettings({ ...settings, image_fallback_mode: event.target.value as UserSettings['image_fallback_mode'] })}>
            <option value="logo">Logo nguồn</option>
            <option value="category">Ảnh chuyên mục</option>
          </select>
        </label>
        <label className="checkbox" title="Bật để bộ lọc có thể hiển thị lại các bài đã ẩn">
          <input type="checkbox" checked={settings.show_hidden} onChange={(event) => setSettings({ ...settings, show_hidden: event.target.checked })} />
          Cho phép xem tin đã ẩn
        </label>
        <button className="button primary" title="Lưu toàn bộ thay đổi cài đặt" onClick={() => void save()}>Lưu cài đặt</button>
        {message && <p className="form-message" role="status">{message}</p>}
      </section>

      <section className="panel">
        <h2>Phím tắt trên laptop</h2>
        <p><kbd>←</kbd>/<kbd>→</kbd> đổi trang hoặc bài; <kbd>S</kbd> lưu bài; <kbd>R</kbd> đánh dấu đã đọc; <kbd>Esc</kbd> quay lại.</p>
      </section>
    </div>
  );
}
