import { useEffect, useRef, useState } from 'react';
import type { ArticleFeedItem } from '../types/domain';
import { formatRelativeTime } from '../utils/date';
import { copyText } from '../utils/clipboard';
import { errorMessage } from '../utils/error';

interface Props {
  article: ArticleFeedItem;
  onSave: () => void;
  onOpen: () => void;
  onSummarize: () => void;
  onToggleRead: () => void;
  onHide: () => void;
  onBlockSource: () => void;
  onBlockTopic: () => void;
}

export function ArticleCard({ article, onSave, onOpen, onSummarize, onToggleRead, onHide, onBlockSource, onBlockTopic }: Props) {
  const [copyLabel, setCopyLabel] = useState('Sao chép link');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const breakdown = article.score_breakdown ?? {};
  const scoreTooltip = `Chuyên mục: ${Math.round(breakdown.category ?? 0)}\nTừ khóa: ${Math.round(breakdown.keywords ?? 0)}\nNguồn: ${Math.round(breakdown.source ?? 0)}\nĐộ mới: ${Math.round(breakdown.freshness ?? 0)}\nChất lượng: ${Math.round(breakdown.quality ?? 0)}\nTổng: ${Math.round(article.relevance_score)}`;

  async function copyOriginalLink() {
    try {
      await copyText(article.original_url);
      setCopyLabel('Đã sao chép');
    } catch (error) {
      setCopyLabel(errorMessage(error));
    }
    window.setTimeout(() => setCopyLabel('Sao chép link'), 2200);
  }

  return (
    <article className={`article-card ${article.is_read ? 'is-read' : ''}`}>
      <a
        title="Mở bài báo gốc trong tab mới"
        href={article.original_url}
        target="_blank"
        rel="noopener noreferrer"
        className="article-image-wrap"
        onClick={onOpen}
      >
        <img className="article-image" src={article.image_url || '/placeholder-news.svg'} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = '/placeholder-news.svg'; }} />
      </a>
      <div className="article-body">
        <div className="article-meta">
          <span className="source-name">{article.source_logo_url && <img src={article.source_logo_url} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}{article.source_name}</span>
          <span>{article.category}</span>
          <time>{formatRelativeTime(article.published_at)}</time>
        </div>
        <a
          title="Mở bài báo gốc trong tab mới"
          href={article.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="article-title"
          onClick={onOpen}
        >
          {article.title}
        </a>
        <p className="article-description">{article.description}</p>
        <div className="tag-row">
          <span className="score" title={scoreTooltip}>{Math.round(article.relevance_score)}</span>
          {article.duplicate_count > 0 && <span className="duplicate-label" title="Hệ thống phát hiện nhiều nguồn đăng nội dung gần giống và đã chọn một bài đại diện">{article.duplicate_count + 1} nguồn cùng đăng</span>}
          {article.matched_keywords?.slice(0, 4).map((keyword) => <span className="keyword" title="Từ khóa khớp quy tắc sở thích" key={keyword}>{keyword}</span>)}
        </div>
        <div className="card-actions compact-actions">
          <button className="summary-button" title="Tóm tắt bài" onClick={onSummarize}>Tóm tắt</button>
          <button className={article.is_saved ? 'saved-action' : ''} title={article.is_saved ? 'Bỏ lưu' : 'Lưu bài'} onClick={onSave} aria-label={article.is_saved ? 'Bỏ lưu' : 'Lưu bài'}>{article.is_saved ? '★' : '☆'}</button>
          <div className="more-actions" ref={menuRef}>
            <button className="more-button" title="Thêm thao tác" aria-label="Thêm thao tác" onClick={() => setMenuOpen((value) => !value)}>⋯</button>
            {menuOpen && <div className="more-menu">
              <a href={article.original_url} target="_blank" rel="noopener noreferrer" onClick={onOpen}>↗ Đọc bài gốc</a>
              <button onClick={() => void copyOriginalLink()}>⧉ {copyLabel}</button>
              <button onClick={onToggleRead}>{article.is_read ? '○ Đánh dấu chưa đọc' : '✓ Đánh dấu đã đọc'}</button>
              <button onClick={onHide}>− Ẩn bài này</button>
              <button onClick={onBlockSource}>× Tắt nguồn</button>
              <button onClick={onBlockTopic}>⊘ Chặn chủ đề</button>
            </div>}
          </div>
        </div>
      </div>
    </article>
  );
}
