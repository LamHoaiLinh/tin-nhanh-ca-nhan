import { DEFAULT_SOURCES } from '../config/defaultSources';
import { supabase } from './supabase';

export interface DefaultSourceBootstrapResult {
  inserted: number;
  existing: number;
  total: number;
}

/**
 * Đồng bộ một lần bộ nguồn mặc định: thêm nguồn còn thiếu và chuẩn hóa tên,
 * chuyên mục, mức ưu tiên, website cùng trạng thái bật của các URL đã xác nhận.
 */
export async function ensureDefaultSources(userId: string): Promise<DefaultSourceBootstrapResult> {
  const urls = DEFAULT_SOURCES.map((source) => source.feed_url);
  const { data: existingRows, error: selectError } = await supabase
    .from('sources')
    .select('feed_url')
    .eq('user_id', userId)
    .in('feed_url', urls);
  if (selectError) throw selectError;

  const existingUrls = new Set((existingRows ?? []).map((row) => row.feed_url));
  const { error: upsertError } = await supabase.from('sources').upsert(
    DEFAULT_SOURCES.map((source) => ({
      ...source,
      user_id: userId,
    })),
    { onConflict: 'user_id,feed_url' },
  );
  if (upsertError) throw upsertError;

  return {
    inserted: DEFAULT_SOURCES.length - existingUrls.size,
    existing: existingUrls.size,
    total: DEFAULT_SOURCES.length,
  };
}
