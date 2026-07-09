import { useEffect, useMemo, useState } from 'react';
import type { ArticleFeedItem, ArticleSummary } from '../types/domain';
import { summarizeArticle } from '../services/functions';
import { copyText } from '../utils/clipboard';
import { errorMessage } from '../utils/error';

interface Props {
  article: ArticleFeedItem;
  open: boolean;
  onClose: () => void;
  onMarkRead: () => void;
}

export function ArticleSummaryModal({ article, open, onClose, onMarkRead }: Props) {
  const [result, setResult] = useState<ArticleSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyNotice, setCopyNotice] = useState('');

  const summaryText = useMemo(() => result?.paragraphs.join('\n\n') ?? '', [result]);

  async function loadSummary(seed = Date.now()) {
    setLoading(true);
    setError('');
    setCopyNotice('');
    try {
      const data = await summarizeArticle(article.id, seed);
      setResult(data);
      onMarkRead();
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setResult(null);
    void loadSummary();
  }, [open, article.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const percent = result ? Math.round(result.compressionRatio * 100) : 0;

  async function copySummary() {
    if (!summaryText) return;
    try {
      await copyText(`${article.title}\n\n${summaryText}\n\nNguồn: ${article.original_url}`);
      setCopyNotice('Đã sao chép bản tóm tắt.');
    } catch (copyError) {
      setCopyNotice(errorMessage(copyError));
    }
  }

  return (
    <div className="summary-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="summary-modal" role="dialog" aria-modal="true" aria-labelledby={`summary-title-${article.id}`}>
        <header className="summary-header">
          <div>
            <span className="summary-kicker">Tóm tắt bằng thuật toán</span>
            <h2 id={`summary-title-${article.id}`}>{article.title}</h2>
            <p>{article.source_name}</p>
          </div>
          <button className="icon-button" title="Đóng cửa sổ tóm tắt" aria-label="Đóng" onClick={onClose}>×</button>
        </header>

        {loading ? (
          <div className="summary-loading"><div className="spinner"/><strong>Đang đọc và chọn lọc ý quan trọng…</strong><span>Thường mất vài giây, tùy tốc độ website nguồn.</span></div>
        ) : error ? (
          <div className="summary-error"><h3>Chưa thể tóm tắt bài này</h3><p>{error}</p><div className="summary-actions"><button className="button primary" onClick={() => void loadSummary()}>Thử lại</button><button onClick={() => void copyText(article.original_url).then(() => setCopyNotice('Đã sao chép link bài gốc.')).catch((copyError) => setCopyNotice(errorMessage(copyError)))}>Sao chép link</button></div></div>
        ) : result ? (
          <>
            <div className="summary-metrics" aria-label="Thông tin bản tóm tắt">
              <span><strong>{percent}%</strong> độ dài bài gốc</span>
              <span><strong>{result.summaryWordCount}</strong> từ tóm tắt</span>
              <span><strong>{result.selectedSentenceCount}</strong> ý chính</span>
            </div>
            {result.warning && <div className="summary-warning">{result.warning}</div>}
            <div className="summary-content">
              {result.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
            </div>
            <p className="summary-note">Bản tóm tắt giữ nguyên câu chữ và góc nhìn chủ đạo của nguồn, nhưng vẫn có thể bỏ sót chi tiết. Hãy đối chiếu bài gốc khi dùng số liệu, nội dung pháp luật hoặc quyết định quan trọng.</p>
            <div className="summary-actions">
              <button className="button primary" onClick={() => void copySummary()}>Sao chép tóm tắt</button>
              <button title="Tạo lại cùng nội dung cốt lõi nhưng thay đổi cách nối câu" onClick={() => void loadSummary(Date.now() + Math.floor(Math.random() * 100000))}>Đổi cách nối câu</button>
              <button onClick={() => void copyText(article.original_url).then(() => setCopyNotice('Đã sao chép link bài gốc.')).catch((copyError) => setCopyNotice(errorMessage(copyError)))}>Sao chép link</button>
              <a className="button" href={article.original_url} target="_blank" rel="noopener noreferrer" onClick={onMarkRead}>Mở bài gốc</a>
            </div>
          </>
        ) : null}
        {copyNotice && <div className="summary-copy-notice" role="status">{copyNotice}</div>}
      </section>
    </div>
  );
}
