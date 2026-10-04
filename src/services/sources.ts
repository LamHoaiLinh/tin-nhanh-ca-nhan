import { supabase } from './supabase';
import type { Source, SourceCatalog } from '../types/domain';
export async function listSources(): Promise<Source[]> {
  const { data, error } = await supabase.from('sources').select('*').order('priority', { ascending: false }).order('name');
  if (error) throw error; return data ?? [];
}
export async function listCatalog(): Promise<SourceCatalog[]> {
  const { data, error } = await supabase.from('source_catalog').select('*').order('name');
  if (error) throw error; return data ?? [];
}
export async function saveSource(input: Partial<Source> & Pick<Source,'name'|'feed_url'|'category'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập.');

  const normalizedFeedUrl = input.feed_url.trim();
  if (!input.id) {
    const { data: existing, error: existingError } = await supabase
      .from('sources')
      .select('id,name')
      .eq('user_id', user.id)
      .eq('feed_url', normalizedFeedUrl)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) throw new Error(`Nguồn RSS này đã có trong “Nguồn của bạn” với tên “${existing.name}”. Không cần thêm lại.`);
  }

  const payload = { ...input, feed_url: normalizedFeedUrl, user_id: user.id };
  const { error } = input.id
    ? await supabase.from('sources').update(payload).eq('id', input.id)
    : await supabase.from('sources').insert(payload);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505') throw new Error('Nguồn RSS này đã tồn tại trong danh sách của bạn. Không cần thêm lại.');
    throw error;
  }
}
export async function deleteSource(id: string): Promise<void> { const { error } = await supabase.from('sources').delete().eq('id', id); if (error) throw error; }
