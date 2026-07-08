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
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Chưa đăng nhập.');
  const payload = { ...input, user_id: user.id };
  const { error } = input.id ? await supabase.from('sources').update(payload).eq('id', input.id) : await supabase.from('sources').insert(payload);
  if (error) throw error;
}
export async function deleteSource(id: string): Promise<void> { const { error } = await supabase.from('sources').delete().eq('id', id); if (error) throw error; }
