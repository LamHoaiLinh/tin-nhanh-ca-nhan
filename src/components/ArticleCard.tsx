import { Link } from 'react-router-dom';
import type { ArticleFeedItem } from '../types/domain';
import { formatRelativeTime } from '../utils/date';

interface Props {
  article: ArticleFeedItem;
  onSave: () => void;
  onRead: () => void;
  onHide: () => void;
  onBlockSource: () => void;
  onBlockTopic: () => void;
}

export function ArticleCard({ article, onSave, onRead, onHide, onBlockSource, onBlockTopic }: Props) {
  const breakdown = article.score_breakdown ?? {};
  const scoreTooltip = `Chuyên mục: ${Math.round(breakdown.category ?? 0)}\nTừ khóa: ${Math.round(breakdown.keywords ?? 0)}\nNguồn: ${Math.round(breakdown.source ?? 0)}\nĐộ mới: ${Math.round(breakdown.freshness ?? 0)}\nChất lượng: ${Math.round(breakdown.quality ?? 0)}\nTổng: ${Math.round(article.relevance_score)}`;

  return (
    <article className={`article-card ${article.is_read ? 'is-read' : ''}`}>
      <Link title="Mở phần tóm tắt và các nguồn cùng đăng" to={`/article/${article.id}`} className="article-image-wrap">
        <img className="article-image" src={article.image_url || '/placeholder-news.svg'} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = '/placeholder-news.svg'; }} />
      </Link>
      <div className="article-body">
        <div className="article-meta">
          <span className="source-name">{article.source_logo_url && <img src={article.source_logo_url} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}{article.source_name}</span>
          <span>{article.category}</span>
          <time>{formatRelativeTime(article.published_at)}</time>
        </div>
        <Link title="Mở chi tiết bài trong ứng dụng" to={`/article/${article.id}`} className="article-title">{article.title}</Link>
        <p className="article-description">{article.description}</p>
        <div className="tag-row">
          <span className="score" title={scoreTooltip}>{Math.round(article.relevance_score)} điểm</span>
          {article.duplicate_count > 0 && <span className="duplicate-label" title="Hệ thống phát hiện nhiều nguồn đăng nội dung gần giống và đã chọn một bài đại diện">{article.duplicate_count + 1} nguồn cùng đăng</span>}
          {article.matched_keywords?.slice(0, 4).map((keyword) => <span className="keyword" title="Từ khóa khớp quy tắc sở thích" key={keyword}>{keyword}</span>)}
        </div>
        <div className="card-actions">
          <a title="Mở nội dung đầy đủ trên website của báo" className="button primary" href={article.original_url} target="_blank" rel="noopener noreferrer" onClick={onRead}>Đọc bài gốc</a>
          <button title="Lưu bài để xem lại sau" onClick={onSave}>{article.is_saved ? 'Bỏ lưu' : 'Lưu'}</button>
          <button title="Đổi trạng thái đã đọc hoặc chưa đọc" onClick={onRead}>{article.is_read ? 'Chưa đọc' : 'Đã đọc'}</button>
          <button className="danger-link" title="Ẩn riêng bài này khỏi danh sách" onClick={onHide}>Ẩn</button>
          <button title="Ngừng lấy bài mới từ toàn bộ nguồn này" onClick={onBlockSource}>Tắt nguồn</button>
          <button title="Tạo quy tắc chặn từ khóa cho các lần quét sau" onClick={onBlockTopic}>Chặn chủ đề</button>
        </div>
      </div>
    </article>
  );
}
