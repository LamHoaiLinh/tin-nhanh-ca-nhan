import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HelpTip } from '../components/HelpTip';
import { deleteSource, listCatalog, listSources, saveSource } from '../services/sources';
import { discoverFeed, scanSource, validateFeed } from '../services/functions';
import type { FeedValidationResult, Source } from '../types/domain';
import { errorMessage } from '../utils/error';
import { formatDateTime } from '../utils/date';

const EMPTY = { name: '', feed_url: '', website_url: '', logo_url: '', category: 'Tin tổng hợp', priority: 5, enabled: true };

export function SourcesPage() {
  const client = useQueryClient();
  const sources = useQuery({ queryKey: ['sources'], queryFn: listSources });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: listCatalog });
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [result, setResult] = useState<FeedValidationResult | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: ['sources'] });

  const save = useMutation({
    mutationFn: () => saveSource({ ...form, id: editingId ?? undefined } as Partial<Source> & Pick<Source, 'name' | 'feed_url' | 'category'>),
    onSuccess: async () => {
      setMessage('Đã lưu nguồn.');
      setForm(EMPTY);
      setEditingId(null);
      setResult(null);
      await refresh();
    },
    onError: (error) => setMessage(errorMessage(error)),
  });

  async function check(url = form.feed_url) {
    setBusy(true);
    setMessage('');
    try {
      const data = await validateFeed(url);
      setResult(data);
      if (!form.name) setForm((current) => ({ ...current, name: data.feedName, website_url: data.websiteUrl ?? current.website_url }));
    } catch (error) {
      setResult(null);
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function discover() {
    setBusy(true);
    setMessage('');
    try {
      const data = await discoverFeed(form.feed_url);
      if (!data.feeds.length) throw new Error('Không tìm thấy RSS trên website này.');
      const first = data.feeds[0];
      if (!first) return;
      setForm((current) => ({ ...current, feed_url: first.url, name: current.name || first.feedName, website_url: first.websiteUrl ?? current.website_url }));
      setResult(first);
      setMessage(data.feeds.length > 1 ? `Tìm thấy ${data.feeds.length} feed; đã chọn feed đầu tiên. Hãy kiểm tra lại trước khi lưu.` : 'Đã tìm thấy RSS.');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function edit(source: Source) {
    setEditingId(source.id);
    setForm({
      name: source.name,
      feed_url: source.feed_url,
      website_url: source.website_url ?? '',
      logo_url: source.logo_url ?? '',
      category: source.category,
      priority: source.priority,
      enabled: source.enabled,
    });
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!result?.valid) {
      setMessage('Bạn cần bấm “Kiểm tra RSS” và nhận kết quả hợp lệ trước khi lưu.');
      return;
    }
    await save.mutateAsync();
  }

  async function addCatalog(feedUrl: string, name: string, category: string, priority: number) {
    setForm({ ...EMPTY, feed_url: feedUrl, name, category, priority });
    setEditingId(null);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await check(feedUrl);
  }

  async function scanAllSources() {
    setMessage('Đang quét toàn bộ nguồn đang bật…');
    try {
      const result = await scanSource();
      setMessage(`Đã quét ${result.scanned} nguồn, thêm ${result.inserted} bài, phát hiện ${result.duplicates} bản trùng${result.errors ? `; ${result.errors} nguồn có lỗi` : ''}.`);
      await refresh();
      await client.invalidateQueries({ queryKey: ['articles'] });
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <div className="stack-page">
      <section className="page-heading">
        <div>
          <h1>Nguồn tin RSS</h1>
          <p>Thêm URL RSS hoặc dán địa chỉ website để hệ thống tìm feed.</p>
        </div>
        <div className="heading-actions">
          <Link className="button" to="/help" title="Xem hướng dẫn tìm và kiểm tra nguồn RSS">Hướng dẫn</Link>
          <button title="Lấy bài mới từ tất cả nguồn đang bật" onClick={() => void scanAllSources()}>Quét toàn bộ</button>
        </div>
      </section>

      <section className="panel">
        <h2>{editingId ? 'Sửa nguồn' : 'Thêm nguồn'} <HelpTip text="Bạn có thể dán trực tiếp URL RSS hoặc dán trang chủ rồi dùng nút Tìm RSS từ website." /></h2>
        <form className="source-form" onSubmit={submit}>
          <label>
            <span className="label-with-tip">URL RSS hoặc website <HelpTip text="URL RSS thường chứa /rss/, .rss, .xml hoặc được ghi là RSS/Feed trên trang báo." /></span>
            <input type="url" required value={form.feed_url} onChange={(event) => { setForm({ ...form, feed_url: event.target.value }); setResult(null); }} placeholder="https://.../rss/..." />
          </label>
          <div className="inline-actions">
            <button type="button" title="Tải thử feed để xác nhận định dạng, số bài và ngày bài mới nhất" disabled={busy || !form.feed_url} onClick={() => void check()}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra RSS'}</button>
            <button type="button" title="Dò các liên kết RSS/Atom được khai báo trong website" disabled={busy || !form.feed_url} onClick={() => void discover()}>Tìm RSS từ website</button>
          </div>
          <label>
            <span className="label-with-tip">Tên nguồn <HelpTip text="Tên dễ nhận biết khi hiển thị trên thẻ bài viết và bộ lọc." /></span>
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span className="label-with-tip">Website gốc <HelpTip text="Trang chủ của báo, dùng để tham chiếu và bổ sung thông tin nguồn." /></span>
            <input type="url" value={form.website_url} onChange={(event) => setForm({ ...form, website_url: event.target.value })} />
          </label>
          <label>
            <span className="label-with-tip">Logo URL <HelpTip text="Không bắt buộc. Logo được dùng làm ảnh dự phòng khi bài viết không có ảnh." /></span>
            <input type="url" value={form.logo_url} onChange={(event) => setForm({ ...form, logo_url: event.target.value })} />
          </label>
          <div className="form-grid">
            <label>
              <span className="label-with-tip">Chuyên mục <HelpTip text="Chuyên mục giúp áp dụng đúng trọng số sở thích khi chấm điểm bài viết." /></span>
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </label>
            <label>
              <span className="label-with-tip">Ưu tiên: {form.priority} <HelpTip text="Nguồn quan trọng nên đặt 8–10; nguồn tham khảo chung nên đặt 4–7." /></span>
              <input type="range" min="1" max="10" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} />
            </label>
            <label className="checkbox" title="Tắt nguồn để ngừng lấy bài mới nhưng vẫn giữ bài đã lưu">
              <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> Bật nguồn
            </label>
          </div>
          {result && (
            <div className="validation-result">
              <strong>RSS hợp lệ</strong>
              <span>{result.feedName} • {result.format} • đọc thử {result.itemCount} bài</span>
              <span>Bài mới nhất: {formatDateTime(result.newestDate)} • {result.hasImage ? 'Có ảnh' : 'Chưa thấy ảnh'}</span>
            </div>
          )}
          <div className="inline-actions">
            <button className="button primary" title="Lưu nguồn sau khi kiểm tra RSS thành công" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu nguồn'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); setResult(null); }}>Hủy sửa</button>}
          </div>
          {message && <p className="form-message" role="status">{message}</p>}
        </form>
      </section>

      <section className="panel">
        <h2>Nguồn của bạn <HelpTip text="Các nguồn mặc định đã kiểm tra sẽ được thêm tự động khi bạn vào giao diện lần đầu." /></h2>
        {sources.isLoading ? <p>Đang tải…</p> : !sources.data?.length ? <p>Chưa có nguồn nào.</p> : (
          <div className="source-list">
            {sources.data.map((source) => (
              <article className="source-row" key={source.id}>
                <div>
                  <strong>{source.name}</strong>
                  <small>{source.feed_url}</small>
                  <span>{source.category} • Ưu tiên {source.priority} • {source.enabled ? 'Đang bật' : 'Đang tắt'}</span>
                  <span>Lần quét: {formatDateTime(source.last_scanned_at)} • {source.last_status ?? 'chưa quét'}{source.last_error ? ` • ${source.last_error}` : ''}</span>
                </div>
                <div className="row-actions">
                  <button title="Chỉ lấy bài mới từ nguồn này" onClick={() => void scanSource(source.id).then(async (result) => { setMessage(`Đã quét ${source.name}: thêm ${result.inserted} bài.`); await refresh(); await client.invalidateQueries({ queryKey: ['articles'] }); }).catch((error) => setMessage(errorMessage(error)))}>Quét ngay</button>
                  <button title="Thay đổi tên, URL, chuyên mục, độ ưu tiên hoặc trạng thái nguồn" onClick={() => edit(source)}>Sửa</button>
                  <button className="danger-link" title="Xóa nguồn và các bài liên quan khỏi tài khoản" onClick={() => { if (confirm(`Xóa nguồn ${source.name}?`)) void deleteSource(source.id).then(refresh).catch((error) => setMessage(errorMessage(error))); }}>Xóa</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Danh mục nguồn gợi ý <HelpTip text="Các nguồn trong danh mục vẫn được kiểm tra thực tế trước khi thêm vào tài khoản." /></h2>
        <p className="muted">URL có thể thay đổi theo từng báo. Mỗi nguồn luôn được kiểm tra thực tế trước khi thêm.</p>
        <div className="catalog-grid">
          {catalog.data?.map((item) => (
            <article key={item.id}>
              <strong>{item.name}</strong>
              <span>{item.category}</span>
              <small>{item.feed_url}</small>
              <span className={item.verification_status === 'verified' ? 'status-ok' : 'status-warn'}>{item.verification_status === 'verified' ? 'Đã xác nhận' : 'Cần kiểm tra lúc thêm'}</span>
              <button title="Đưa nguồn lên biểu mẫu, kiểm tra feed rồi mới lưu" onClick={() => void addCatalog(item.feed_url, item.name, item.category, item.priority)}>Kiểm tra & thêm</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
