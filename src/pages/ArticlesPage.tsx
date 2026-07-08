import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArticleCard } from '../components/ArticleCard';
import { BottomNav } from '../components/BottomNav';
import { FilterSheet } from '../components/FilterSheet';
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

const INITIAL: ArticleFilters = { search:'', sort:'relevance', state:'all', category:'', sourceId:'', minScore:0, fromDate:'', toDate:'', page:1, pageSize:20 };
export function ArticlesPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(INITIAL);
  const [filterOpen, setFilterOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const queryClient = useQueryClient();
  const queryFilters = { ...filters, search: debouncedSearch };
  const articles = useQuery({ queryKey:['articles',queryFilters], queryFn:()=>fetchArticles(queryFilters), placeholderData:(previous)=>previous });
  const sources = useQuery({ queryKey:['sources'], queryFn:listSources });
  const totalPages = Math.max(1, Math.ceil((articles.data?.count ?? 0) / filters.pageSize));
  const categories = useMemo(()=>[...new Set((sources.data??[]).map((x)=>x.category).filter(Boolean))].sort(),[sources.data]);
  const change = (patch:Partial<ArticleFilters>) => setFilters((current)=>({...current,...patch}));
  const mutateState = async (id:string, patch:Parameters<typeof setArticleState>[1]) => { try { await setArticleState(id,patch); await queryClient.invalidateQueries({queryKey:['articles']}); } catch(error){setNotice(errorMessage(error));} };
  const goPrevious = () => change({page:Math.max(1,filters.page-1)});
  const goNext = () => change({page:Math.min(totalPages,filters.page+1)});
  useKeyboardShortcuts({ previous:goPrevious, next:goNext });
  async function scanAll() { setNotice('Đang quét nguồn tin…'); try { const result=await scanSource(); setNotice(`Đã quét ${result.scanned} nguồn, thêm ${result.inserted} bài, phát hiện ${result.duplicates} bản trùng.`); await queryClient.invalidateQueries({queryKey:['articles']}); await queryClient.invalidateQueries({queryKey:['sources']}); } catch(error){setNotice(errorMessage(error));} }
  return <>
    <section className="page-heading"><div><h1>Tin dành cho anh</h1><p>{articles.data?.count ?? 0} bài phù hợp với bộ lọc hiện tại</p></div><div className="heading-actions"><button onClick={()=>void scanAll()}>Quét ngay</button><button className="button primary" onClick={()=>setFilterOpen(true)}>Bộ lọc</button></div></section>
    <section className="search-toolbar"><input aria-label="Tìm kiếm" placeholder="Tìm không phân biệt dấu theo tiêu đề hoặc mô tả…" value={filters.search} onChange={(e)=>change({search:e.target.value,page:1})}/><select value={filters.sort} onChange={(e)=>change({sort:e.target.value as ArticleFilters['sort'],page:1})}><option value="relevance">Phù hợp nhất</option><option value="newest">Mới nhất</option></select><select value={filters.pageSize} onChange={(e)=>change({pageSize:Number(e.target.value),page:1})}>{[10,20,30,50].map(x=><option value={x} key={x}>{x} bài/trang</option>)}</select></section>
    {notice && <div className="notice" role="status">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
    {articles.isLoading ? <LoadingSkeleton/> : articles.isError ? <div className="empty-state"><h2>Không tải được tin</h2><p>{errorMessage(articles.error)}</p></div> : !articles.data?.items.length ? <div className="empty-state"><h2>Chưa có bài phù hợp</h2><p>Hãy thêm nguồn RSS, quét tin hoặc giảm điều kiện lọc.</p></div> : <div className="article-grid">{articles.data.items.map((article)=><ArticleCard key={article.id} article={article} onSave={()=>void mutateState(article.id,{is_saved:!article.is_saved})} onRead={()=>void mutateState(article.id,{is_read:!article.is_read,opened_at:new Date().toISOString()})} onHide={()=>void mutateState(article.id,{is_hidden:true})} onBlockSource={()=>{ if(confirm(`Tắt nguồn ${article.source_name}?`)) void supabase.from('sources').update({enabled:false}).eq('id',article.source_id).then(async({error})=>{ if(error)setNotice(error.message); else {setNotice(`Đã tắt nguồn ${article.source_name}.`);await queryClient.invalidateQueries({queryKey:['articles']});await queryClient.invalidateQueries({queryKey:['sources']});}}); }} onBlockTopic={()=>{ const keyword=prompt('Nhập từ khóa hoặc cụm từ cần chặn:',article.matched_keywords?.[0]??article.category); if(keyword?.trim()&&user) void supabase.from('keyword_rules').insert({user_id:user.id,keyword:keyword.trim(),rule_type:'negative',target_field:'all',weight:100,enabled:true}).then(({error})=>setNotice(error?error.message:`Đã chặn chủ đề “${keyword.trim()}” cho các lần quét sau.`)); }}/>)}</div>}
    <FilterSheet open={filterOpen} filters={filters} sources={sources.data??[]} categories={categories} onChange={change} onClose={()=>setFilterOpen(false)}/>
    <BottomNav page={filters.page} totalPages={totalPages} onPrevious={goPrevious} onNext={goNext} onTop={()=>window.scrollTo({top:0,behavior:'smooth'})} loading={articles.isFetching}/>
  </>;
}
