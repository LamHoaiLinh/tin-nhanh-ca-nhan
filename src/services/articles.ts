import { supabase } from './supabase';
import type { ArticleFeedItem, ArticleFilters } from '../types/domain';
import { normalizeForSearch } from '../algorithms/text';

export async function fetchArticles(filters: ArticleFilters): Promise<{ items: ArticleFeedItem[]; count: number }> {
  let query = supabase.from('article_feed').select('*', { count: 'exact' }).eq('is_hidden', false);
  if (filters.search.trim()) query = query.ilike('search_text', `%${normalizeForSearch(filters.search)}%`);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.sourceId) query = query.eq('source_id', filters.sourceId);
  if (filters.state === 'unread') query = query.eq('is_read', false);
  if (filters.state === 'saved') query = query.eq('is_saved', true);
  if (filters.minScore > 0) query = query.gte('relevance_score', filters.minScore);
  if (filters.fromDate) query = query.gte('published_at', `${filters.fromDate}T00:00:00`);
  if (filters.toDate) query = query.lte('published_at', `${filters.toDate}T23:59:59`);
  query = query.order('published_at', { ascending: false }).order('fetched_at', { ascending: false });
  const from = (filters.page - 1) * filters.pageSize;
  const { data, error, count } = await query.range(from, from + filters.pageSize - 1);
  if (error) throw error;
  return { items: (data ?? []) as ArticleFeedItem[], count: count ?? 0 };
}

export async function fetchArticle(id: string): Promise<ArticleFeedItem> {
  const { data, error } = await supabase.from('article_feed').select('*').eq('id', id).single();
  if (error) throw error;
  return data as ArticleFeedItem;
}

export async function setArticleState(articleId: string, patch: Partial<{ is_read:boolean; is_saved:boolean; is_hidden:boolean; opened_at:string|null }>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');
  const { error } = await supabase.from('article_states').upsert({ user_id: user.id, article_id: articleId, ...patch }, { onConflict: 'user_id,article_id' });
  if (error) throw error;
}


export interface ArticleAlternative { id:string; title:string; original_url:string; published_at:string; sources:{name:string;logo_url:string|null}|null; }
export async function fetchAlternatives(representativeId: string): Promise<ArticleAlternative[]> {
  const { data, error } = await supabase.from('articles').select('id,title,original_url,published_at,sources(name,logo_url)').eq('duplicate_of', representativeId).order('published_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ArticleAlternative[];
}
