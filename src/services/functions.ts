import { supabase, supabasePublishableKey, supabaseUrl } from './supabase';
import type { ArticleSummary, FeedValidationResult } from '../types/domain';

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
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
      return payload;
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
export const scanSource = (sourceId?: string) => invoke<{ scanned: number; inserted: number; duplicates: number; errors: number }>('scan-rss', sourceId ? { sourceId } : { all: true });
export const summarizeArticle = (articleId: string, seed = Date.now()) => summarizeDirect(articleId, seed);
