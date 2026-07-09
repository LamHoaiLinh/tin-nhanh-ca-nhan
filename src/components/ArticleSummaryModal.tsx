import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArticleFeedItem, ArticleSummary } from '../types/domain';
import { summarizeArticle } from '../services/functions';

interface Props {
  articles: ArticleFeedItem[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onMarkRead: (article: ArticleFeedItem) => void;
}

type FontScale = 'small' | 'medium' | 'large';

const FONT_LABELS: Record<FontScale, string> = {
  small: 'Chữ nhỏ',
  medium: 'Chữ vừa',
  large: 'Chữ lớn',
};

function fallbackSummary(article: ArticleFeedItem, reason?: string): ArticleSummary | null {
  const description = article.description?.replace(/\s+/g, ' ').trim();
  if (!description || description.length < 35) return null;
  const wordCount = description.split(/\s+/).filter(Boolean).length;
  return {
    articleId: article.id,
    title: article.title,
    sourceName: article.source_name,
    originalUrl: article.original_url,
    extractionMethod: 'rss-description',
    warning: reason ? 'Đang hiển thị bản đọc nhanh từ mô tả RSS vì chưa lấy được toàn văn bài gốc.' : null,
    paragraphs: [description],
    originalWordCount: wordCount,
    summaryWordCount: wordCount,
    compressionRatio: 1,
    selectedSentenceCount: Math.max(1, description.split(/(?<=[.!?…])\s+/u).length),
  };
}

function readInitialFont(): FontScale {
  const stored = window.localStorage.getItem('tin-nhanh-summary-font');
  return stored === 'small' || stored === 'large' ? stored : 'medium';
}

export function ArticleSummaryModal({ articles, currentIndex, onClose, onNavigate, onMarkRead }: Props) {
  const article = currentIndex === null ? null : articles[currentIndex] ?? null;
  const [cache, setCache] = useState<Record<string, ArticleSummary>>({});
  const [loading, setLoading] = useState(false);
  const [technicalError, setTechnicalError] = useState('');
  const [fontScale, setFontScale] = useState<FontScale>(readInitialFont);
  const contentRef = useRef<HTMLDivElement>(null);

  const result = article ? cache[article.id] ?? null : null;
  const hasPrevious = currentIndex !== null && currentIndex > 0;
  const hasNext = currentIndex !== null && currentIndex < articles.length - 1;
  const positionText = currentIndex === null ? '' : `${currentIndex + 1} / ${articles.length}`;

  const statusText = useMemo(() => {
    if (!result?.warning) return '';
    return result.extractionMethod === 'rss-description'
      ? 'Bản đọc nhanh từ mô tả RSS'
      : 'Bản tóm tắt có giới hạn dữ liệu nguồn';
  }, [result]);

  useEffect(() => {
    window.localStorage.setItem('tin-nhanh-summary-font', fontScale);
  }, [fontScale]);

  useEffect(() => {
    if (!article) return;
    contentRef.current?.scrollTo({ top: 0 });
    onMarkRead(article);

    if (cache[article.id]) {
      setTechnicalError('');
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setTechnicalError('');
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const data = await summarizeArticle(article.id, Date.now() + attempt * 7919);
          if (!cancelled) setCache((current) => ({ ...current, [article.id]: data }));
          if (!cancelled) setLoading(false);
          return;
        } catch (error) {
          lastError = error;
          if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 900));
        }
      }

      if (cancelled) return;
      const message = lastError instanceof Error ? lastError.message : 'Không thể kết nối chức năng tóm tắt.';
      const fallback = fallbackSummary(article, message);
      if (fallback) setCache((current) => ({ ...current, [article.id]: fallback }));
      else setTechnicalError('Chưa lấy được nội dung đủ dài để tạo bản đọc nhanh.');
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [article?.id]);

  useEffect(() => {
    if (!article) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && hasPrevious && currentIndex !== null) onNavigate(currentIndex - 1);
      if (event.key === 'ArrowRight' && hasNext && currentIndex !== null) onNavigate(currentIndex + 1);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [article?.id, currentIndex, hasPrevious, hasNext, onClose, onNavigate]);

  if (!article || currentIndex === null) return null;

  return (
    <div className="summary-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="summary-modal summary-reader" role="dialog" aria-modal="true" aria-labelledby={`summary-title-${article.id}`}>
        <header className="summary-header">
          <div className="summary-heading-copy">
            <span className="summary-kicker">Bản đọc nhanh</span>
            <h2 id={`summary-title-${article.id}`}>{article.title}</h2>
            <p>{article.source_name}</p>
          </div>
          <div className="summary-header-tools" aria-label="Tùy chọn đọc">
            <div className="summary-font-controls" role="group" aria-label="Cỡ chữ">
              {(['small', 'medium', 'large'] as FontScale[]).map((size) => (
                <button
                  key={size}
                  className={fontScale === size ? 'active' : ''}
                  title={FONT_LABELS[size]}
                  aria-label={FONT_LABELS[size]}
                  aria-pressed={fontScale === size}
                  onClick={() => setFontScale(size)}
                >
                  {size === 'small' ? 'A−' : size === 'large' ? 'A+' : 'A'}
                </button>
              ))}
            </div>
            <button className="icon-button" title="Đóng cửa sổ tóm tắt" aria-label="Đóng" onClick={onClose}>×</button>
          </div>
        </header>

        <div ref={contentRef} className={`summary-reader-content font-${fontScale}`}>
          {loading ? (
            <div className="summary-loading">
              <div className="spinner" />
              <strong>Đang đọc và tóm tắt tự động…</strong>
              <span>Hệ thống đang lấy toàn văn, chọn ý chính và nối lại thành các đoạn dễ đọc.</span>
            </div>
          ) : result ? (
            <article className="summary-content" aria-live="polite">
              {statusText && <div className="summary-source-status">{statusText}</div>}
              {result.warning && result.extractionMethod === 'rss-description' && (
                <p className="summary-source-note">{result.warning}</p>
              )}
              {result.paragraphs.map((paragraph, index) => (
                <p key={`${article.id}-${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </article>
          ) : (
            <div className="summary-error">
              <h3>Chưa thể tạo bản đọc nhanh</h3>
              <p>{technicalError}</p>
            </div>
          )}
        </div>

        <footer className="summary-reader-nav">
          <button disabled={!hasPrevious || loading} onClick={() => hasPrevious && onNavigate(currentIndex - 1)} title="Tóm tắt bài trước (phím mũi tên trái)">← Bài trước</button>
          <strong>{positionText}</strong>
          <button className="button primary" disabled={!hasNext || loading} onClick={() => hasNext && onNavigate(currentIndex + 1)} title="Tóm tắt bài tiếp theo (phím mũi tên phải)">Bài tiếp →</button>
        </footer>
      </section>
    </div>
  );
}
