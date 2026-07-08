import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DetailBottomNav } from '../components/DetailBottomNav';
import { fetchAlternatives, fetchArticle, setArticleState } from '../services/articles';
import { formatDateTime } from '../utils/date';
import { errorMessage } from '../utils/error';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
export function ArticleDetailPage() {
  const { id = '' } = useParams(); const navigate=useNavigate(); const location=useLocation();
  const query=useQuery({queryKey:['article',id],queryFn:()=>fetchArticle(id),enabled:Boolean(id)});
  const alternatives=useQuery({queryKey:['article-alternatives',id],queryFn:()=>fetchAlternatives(id),enabled:Boolean(id)&&Boolean(query.data?.duplicate_count)});
  useEffect(()=>{ if(id) void setArticleState(id,{is_read:true,opened_at:new Date().toISOString()}); },[id]);
  useKeyboardShortcuts({ back:()=>navigate(-1), save:()=>query.data && void setArticleState(query.data.id,{is_saved:!query.data.is_saved}), read:()=>query.data && void setArticleState(query.data.id,{is_read:!query.data.is_read}) });
  if(query.isLoading) return <div className="center-screen"><div className="spinner"/>Đang tải bài…</div>;
  if(query.isError || !query.data) return <div className="empty-state"><h2>Không tìm thấy bài</h2><p>{query.error?errorMessage(query.error):'Bài có thể đã bị xóa.'}</p><button onClick={()=>navigate('/')}>Về danh sách</button></div>;
  const article=query.data;
  return <><article className="detail-page"><div className="article-meta"><span>{article.source_name}</span><span>{article.category}</span><time>{formatDateTime(article.published_at)}</time></div><h1>{article.title}</h1><img className="detail-image" src={article.image_url||'/placeholder-news.svg'} alt="" onError={(e)=>{e.currentTarget.src='/placeholder-news.svg';}}/><p className="detail-description">{article.description}</p><div className="detail-score"><strong>Mức phù hợp: {Math.round(article.relevance_score)}/100</strong><span>{article.matched_keywords?.length?`Từ khóa khớp: ${article.matched_keywords.join(', ')}`:'Không có từ khóa trực tiếp'}</span></div>{alternatives.data?.length ? <section className="alternative-sources"><h2>Các nguồn khác cùng đăng</h2>{alternatives.data.map((item)=><a key={item.id} href={item.original_url} target="_blank" rel="noopener noreferrer"><strong>{item.sources?.name??'Nguồn khác'}</strong><span>{item.title}</span></a>)}</section> : null}<p className="copyright-note">Ứng dụng chỉ lưu tiêu đề, mô tả ngắn và liên kết từ RSS. Nội dung đầy đủ thuộc website nguồn.</p></article><DetailBottomNav onBack={()=>{ if (location.key === 'default') void navigate('/'); else void navigate(-1); }} originalUrl={article.original_url}/></>;
}
