import { useState } from 'react';
import type { ArticleFeedItem } from '../types/domain';
import { formatRelativeTime } from '../utils/date';
import { copyText } from '../utils/clipboard';
import { ArticleSummaryModal } from './ArticleSummaryModal';
import { errorMessage } from '../utils/error';

interface Props {
  article: ArticleFeedItem;
  onSave: () => void;
  onOpen: () => void;
  onToggleRead: () => void;
  onHide: () => void;
  onBlockSource: () => void;
  onBlockTopic: () => void;
}

export function ArticleCard({ article, onSave, onOpen, onToggleRead, onHide, onBlockSource, onBlockTopic }: Props) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Sao chép link');
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
    <>
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
            <span className="score" title={scoreTooltip}>{Math.round(article.relevance_score)} điểm</span>
            {article.duplicate_count > 0 && <span className="duplicate-label" title="Hệ thống phát hiện nhiều nguồn đăng nội dung gần giống và đã chọn một bài đại diện">{article.duplicate_count + 1} nguồn cùng đăng</span>}
            {article.matched_keywords?.slice(0, 4).map((keyword) => <span className="keyword" title="Từ khóa khớp quy tắc sở thích" key={keyword}>{keyword}</span>)}
          </div>
          <div className="card-actions">
            <a title="Mở nội dung đầy đủ trên website của báo" className="button primary" href={article.original_url} target="_blank" rel="noopener noreferrer" onClick={onOpen}>Đọc bài gốc</a>
            <button className="summary-button" title="Đọc nội dung bài gốc và tạo bản tóm tắt khoảng 25–35% bằng thuật toán, không dùng AI trả phí" onClick={() => setSummaryOpen(true)}>Tóm tắt</button>
            <button title="Sao chép chính xác đường dẫn bài báo gốc" onClick={() => void copyOriginalLink()}>{copyLabel}</button>
            <button title="Lưu bài để xem lại sau" onClick={onSave}>{article.is_saved ? 'Bỏ lưu' : 'Lưu'}</button>
            <button title="Đổi trạng thái đã đọc hoặc chưa đọc" onClick={onToggleRead}>{article.is_read ? 'Chưa đọc' : 'Đã đọc'}</button>
            <button className="danger-link" title="Ẩn riêng bài này khỏi danh sách" onClick={onHide}>Ẩn</button>
            <button title="Ngừng lấy bài mới từ toàn bộ nguồn này" onClick={onBlockSource}>Tắt nguồn</button>
            <button title="Tạo quy tắc chặn từ khóa cho các lần quét sau" onClick={onBlockTopic}>Chặn chủ đề</button>
          </div>
        </div>
      </article>
      <ArticleSummaryModal article={article} open={summaryOpen} onClose={() => setSummaryOpen(false)} onMarkRead={onOpen} />
    </>
  );
}
