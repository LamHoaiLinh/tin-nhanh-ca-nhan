import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HelpTip } from '../components/HelpTip';
import { supabase } from '../services/supabase';
import type { UserSettings } from '../types/domain';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../utils/error';
import { fetchDatabaseStorageHealth } from '../services/storage';
import { formatBytes } from '../utils/storage';

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const storage = useQuery({ queryKey: ['database-storage-health'], queryFn: fetchDatabaseStorageHealth, staleTime: 5 * 60 * 1000, retry: 1 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (query.data) setSettings(query.data);
  }, [query.data]);

  async function save() {
    if (!user || !settings) return;
    const { error } = await supabase.from('user_settings').upsert({ ...settings, user_id: user.id });
    if (error) setMessage(errorMessage(error));
    else {
      setMessage('Đã lưu cài đặt.');
      await queryClient.invalidateQueries({ queryKey: ['database-storage-health'] });
    }
  }

  if (!settings) return <div className="center-screen">Đang tải cài đặt…</div>;

  return (
    <div className="stack-page">
      <section className="page-heading">
        <div>
          <h1>Cài đặt</h1>
          <p>Các thông số ảnh hưởng đến phân trang, thời gian lưu, nhật ký quét và cảnh báo dung lượng.</p>
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
          <span className="label-with-tip">Giữ nhật ký quét trong bao nhiêu ngày <HelpTip text="Nhật ký quét chỉ dùng để kiểm tra lỗi nguồn RSS. Giữ 30 ngày thường là đủ cho ứng dụng cá nhân." /></span>
          <input type="number" min="7" max="365" value={settings.scan_log_retention_days} onChange={(event) => setSettings({ ...settings, scan_log_retention_days: Number(event.target.value) })} />
        </label>
        <label>
          <span className="label-with-tip">Giới hạn database để cảnh báo (MB) <HelpTip text="Nhập giới hạn dung lượng theo gói Supabase đang dùng. Hệ thống cảnh báo từ 70% và cảnh báo mạnh từ 80%." /></span>
          <input type="number" min="100" max="1048576" value={settings.database_limit_mb} onChange={(event) => setSettings({ ...settings, database_limit_mb: Number(event.target.value) })} />
        </label>
        <label>
          <span className="label-with-tip">Khoảng quét mong muốn (phút) <HelpTip text="Thông số tham chiếu cho lịch quét. GitHub Actions hiện quét khoảng hai lần mỗi giờ." /></span>
          <input type="number" min="15" max="1440" value={settings.scan_interval_minutes} onChange={(event) => setSettings({ ...settings, scan_interval_minutes: Number(event.target.value) })} />
        </label>
        <label>
          <span className="label-with-tip">Thứ tự hiển thị <HelpTip text="Các bài đã qua bộ lọc cá nhân hóa và luôn được xếp theo thời gian đăng mới nhất." /></span>
          <input value="Mới nhất trước" readOnly aria-readonly="true" />
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

      <section className="panel storage-health-panel">
        <div className="storage-health-heading">
          <div>
            <h2>Dung lượng database</h2>
            <p>Kiểm tra tự động từ PostgreSQL. Cảnh báo vàng ở 70% và cảnh báo đỏ ở 80% giới hạn đã nhập.</p>
          </div>
          <button type="button" onClick={() => void storage.refetch()} disabled={storage.isFetching}>Kiểm tra lại</button>
        </div>
        {storage.isLoading ? <p>Đang kiểm tra dung lượng…</p> : storage.isError ? <p className="form-message">Chưa đọc được dung lượng. Hãy chạy migration mới rồi thử lại.</p> : storage.data ? (
          <div className={`storage-meter ${storage.data.level}`}>
            <div className="storage-meter-label"><strong>{formatBytes(storage.data.usedBytes)} / {formatBytes(storage.data.limitBytes)}</strong><span>{storage.data.percent}%</span></div>
            <div className="storage-meter-track"><span style={{ width: `${Math.min(100, storage.data.percent)}%` }} /></div>
            <p>{storage.data.level === 'critical' ? 'Dung lượng đã vượt 80%. Nên giảm thời gian giữ bài hoặc chạy dọn dữ liệu ngay.' : storage.data.level === 'warning' ? 'Dung lượng đã vượt 70%. Hãy theo dõi và bảo đảm workflow dọn dữ liệu đang chạy xanh.' : 'Dung lượng đang trong vùng an toàn.'}</p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Phím tắt trên laptop</h2>
        <p><kbd>←</kbd>/<kbd>→</kbd> đổi trang hoặc bài; <kbd>S</kbd> lưu bài; <kbd>R</kbd> đánh dấu đã đọc; <kbd>Esc</kbd> quay lại.</p>
      </section>
    </div>
  );
}
