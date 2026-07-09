import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArticleCard } from '../components/ArticleCard';
import { BottomNav } from '../components/BottomNav';
import { FilterSheet } from '../components/FilterSheet';
import { HelpTip } from '../components/HelpTip';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { fetchArticles, setArticleState } from '../services/articles';
import { listSources } from '../services/sources';
import { scanSource } from '../services/functions';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import type { ArticleFilters } from '../types/domain';
import { errorMessage } from '../utils/error';

const INITIAL: ArticleFilters = { search: '', sort: 'relevance', state: 'all', category: '', sourceId: '', minScore: 0, fromDate: '', toDate: '', page: 1, pageSize: 20 };

export function ArticlesPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(INITIAL);
  const [filterOpen, setFilterOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const queryClient = useQueryClient();
  const queryFilters = { ...filters, search: debouncedSearch };
  const articles = useQuery({ queryKey: ['articles', queryFilters], queryFn: () => fetchArticles(queryFilters), placeholderData: (previous) => previous });
  const sources = useQuery({ queryKey: ['sources'], queryFn: listSources });
  const totalPages = Math.max(1, Math.ceil((articles.data?.count ?? 0) / filters.pageSize));
  const categories = useMemo(() => [...new Set((sources.data ?? []).map((source) => source.category).filter(Boolean))].sort(), [sources.data]);
  const change = (patch: Partial<ArticleFilters>) => setFilters((current) => ({ ...current, ...patch }));

  const mutateState = async (id: string, patch: Parameters<typeof setArticleState>[1]) => {
    try {
      await setArticleState(id, patch);
      await queryClient.invalidateQueries({ queryKey: ['articles'] });
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const goPrevious = () => change({ page: Math.max(1, filters.page - 1) });
  const goNext = () => change({ page: Math.min(totalPages, filters.page + 1) });
  useKeyboardShortcuts({ previous: goPrevious, next: goNext });

  async function scanAll() {
    setNotice('Đang quét nguồn tin…');
    try {
      const result = await scanSource();
      setNotice(`Đã quét ${result.scanned} nguồn, thêm ${result.inserted} bài, phát hiện ${result.duplicates} bản trùng${result.errors ? `; ${result.errors} nguồn có lỗi` : ''}.`);
      await queryClient.invalidateQueries({ queryKey: ['articles'] });
      await queryClient.invalidateQueries({ queryKey: ['sources'] });
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Tin dành cho bạn <HelpTip text="Danh sách được xếp theo từ khóa, chuyên mục, độ ưu tiên nguồn, độ mới và chất lượng dữ liệu." /></h1>
          <p>{articles.data?.count ?? 0} bài phù hợp với bộ lọc hiện tại</p>
        </div>
        <div className="heading-actions">
          <button title="Lấy bài mới từ tất cả nguồn RSS đang bật" onClick={() => void scanAll()}>Quét ngay</button>
          <button className="button primary" title="Lọc theo trạng thái, nguồn, chuyên mục, điểm hoặc ngày đăng" onClick={() => setFilterOpen(true)}>Bộ lọc</button>
          <Link className="button" to="/help" title="Mở hướng dẫn đọc tin và đặt từ khóa">Trợ giúp</Link>
        </div>
      </section>

      <section className="search-toolbar">
        <input title="Tìm trong tiêu đề và mô tả, không phân biệt dấu tiếng Việt" aria-label="Tìm kiếm" placeholder="Tìm không phân biệt dấu theo tiêu đề hoặc mô tả…" value={filters.search} onChange={(event) => change({ search: event.target.value, page: 1 })} />
        <select title="Chọn ưu tiên điểm phù hợp hoặc thời gian đăng" value={filters.sort} onChange={(event) => change({ sort: event.target.value as ArticleFilters['sort'], page: 1 })}>
          <option value="relevance">Phù hợp nhất</option>
          <option value="newest">Mới nhất</option>
        </select>
        <select title="Chọn số bài hiển thị trên mỗi trang" value={filters.pageSize} onChange={(event) => change({ pageSize: Number(event.target.value), page: 1 })}>
          {[10, 20, 30, 50].map((value) => <option value={value} key={value}>{value} bài/trang</option>)}
        </select>
      </section>

      {notice && <div className="notice" role="status">{notice}<button title="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}

      {articles.isLoading ? <LoadingSkeleton /> : articles.isError ? (
        <div className="empty-state"><h2>Không tải được tin</h2><p>{errorMessage(articles.error)}</p></div>
      ) : !articles.data?.items.length ? (
        <div className="empty-state"><h2>Chưa có bài phù hợp</h2><p>Hãy thêm nguồn RSS, quét tin hoặc giảm điều kiện lọc.</p></div>
      ) : (
        <div className="article-grid">
          {articles.data.items.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onSave={() => void mutateState(article.id, { is_saved: !article.is_saved })}
              onRead={() => void mutateState(article.id, { is_read: !article.is_read, opened_at: new Date().toISOString() })}
              onHide={() => void mutateState(article.id, { is_hidden: true })}
              onBlockSource={() => {
                if (confirm(`Tắt nguồn ${article.source_name}?`)) {
                  void supabase.from('sources').update({ enabled: false }).eq('id', article.source_id).then(async ({ error }) => {
                    if (error) setNotice(error.message);
                    else {
                      setNotice(`Đã tắt nguồn ${article.source_name}.`);
                      await queryClient.invalidateQueries({ queryKey: ['articles'] });
                      await queryClient.invalidateQueries({ queryKey: ['sources'] });
                    }
                  });
                }
              }}
              onBlockTopic={() => {
                const keyword = prompt('Nhập từ khóa hoặc cụm từ cần chặn:', article.matched_keywords?.[0] ?? article.category);
                if (keyword?.trim() && user) {
                  void supabase.from('keyword_rules').insert({ user_id: user.id, keyword: keyword.trim(), rule_type: 'negative', target_field: 'all', weight: 100, enabled: true }).then(({ error }) => setNotice(error ? error.message : `Đã chặn chủ đề “${keyword.trim()}” cho các lần quét sau.`));
                }
              }}
            />
          ))}
        </div>
      )}

      <FilterSheet open={filterOpen} filters={filters} sources={sources.data ?? []} categories={categories} onChange={change} onClose={() => setFilterOpen(false)} />
      <BottomNav page={filters.page} totalPages={totalPages} onPrevious={goPrevious} onNext={goNext} onTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })} loading={articles.isFetching} />
    </>
  );
}
