import { supabase, supabasePublishableKey, supabaseUrl } from './supabase';
import type { ArticleSummary, FeedValidationResult } from '../types/domain';
import { ensureInsightQuestions } from '../algorithms/insightQuestions';

async function invoke<T>(name: string, body: Record<string, unknown>, timeoutMs = 45_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  let data: unknown;
  let error: { message: string; context?: unknown } | null;
  try {
    const response = await supabase.functions.invoke(name, { body, signal: controller.signal });
    data = response.data;
    error = response.error;
  } catch (cause) {
    if (controller.signal.aborted) throw new Error('Quét quá thời gian cho phép; nguồn này sẽ được thử lại sau.');
    throw cause;
  } finally {
    window.clearTimeout(timer);
  }
  if (error) {
    let message = error.message;
    const context = (error as unknown as { context?: Response }).context;
    if (context) {
      try {
        const payload = await context.clone().json() as { error?: string };
        if (payload.error) message = payload.error;
      } catch {
        // Giữ thông báo mặc định khi phản hồi không phải JSON.
      }
    }
    throw new Error(message);
  }
  const result = data as { error?: string } & T;
  if (result?.error) throw new Error(result.error);
  return result;
}

async function summarizeDirect(articleId: string, seed: number): Promise<ArticleSummary> {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error('Website chưa có cấu hình kết nối Supabase.');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 35_000);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/summarize-article`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabasePublishableKey,
          'Authorization': `Bearer ${session.access_token}`,
          'x-client-info': 'tin-nhanh-ca-nhan-web/1.3',
        },
        body: JSON.stringify({ articleId, seed: seed + attempt * 3571 }),
      });

      const text = await response.text();
      let payload: ({ error?: string } & ArticleSummary) | null = null;
      try { payload = text ? JSON.parse(text) as ({ error?: string } & ArticleSummary) : null; } catch { /* phản hồi không phải JSON */ }

      if (!response.ok) {
        const detail = payload?.error || `Edge Function trả về HTTP ${response.status}.`;
        throw new Error(detail);
      }
      if (!payload) throw new Error('Edge Function không trả về dữ liệu hợp lệ.');
      if (payload.error) throw new Error(payload.error);
      return ensureInsightQuestions(payload, seed);
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === 'AbortError') lastError = new Error('Chức năng tóm tắt phản hồi quá lâu.');
      if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 700));
    } finally {
      window.clearTimeout(timer);
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Không kết nối được chức năng tóm tắt.';
  if (/Failed to fetch|NetworkError|send a request/i.test(message)) {
    throw new Error('Chưa kết nối được Edge Function summarize-article. Hệ thống sẽ dùng mô tả RSS tạm thời.');
  }
  throw new Error(message);
}

export const validateFeed = (url: string) => invoke<FeedValidationResult>('validate-feed', { url });
export const discoverFeed = (url: string) => invoke<{ feeds: Array<FeedValidationResult & { url: string }> }>('discover-feed', { url });
export type ScanProgress = (finished: number, total: number) => void;
type ScanResult = { scanned: number; inserted: number; duplicates: number; errors: number };

// Keep each Edge Function invocation small; the previous all-sources request timed out.
export async function scanSource(sourceId?: string, onProgress?: ScanProgress): Promise<ScanResult> {
  if (sourceId) return invoke<ScanResult>('scan-rss', { sourceId }, 45_000);

  const { data: feeds, error } = await supabase.from('sources')
    .select('id').eq('enabled', true).order('last_scanned_at', { ascending: true, nullsFirst: true });
  if (error) throw error;
  const ids = (feeds ?? []).map(feed => feed.id);
  const result: ScanResult = { scanned: 0, inserted: 0, duplicates: 0, errors: 0 };
  if (!ids.length) return result;
  let cursor = 0;
  let finished = 0;
  const workers = Array.from({ length: Math.min(2, ids.length) }, async () => {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        const item = await invoke<ScanResult>('scan-rss', { sourceId: id }, 45_000);
        result.scanned += item.scanned;
        result.inserted += item.inserted;
        result.duplicates += item.duplicates;
        result.errors += item.errors;
      } catch {
        result.scanned += 1;
        result.errors += 1;
      } finally {
        finished += 1;
        onProgress?.(finished, ids.length);
      }
    }
  });
  await Promise.all(workers);
  return result;
}
export const summarizeArticle = (articleId: string, seed = Date.now()) => summarizeDirect(articleId, seed);
