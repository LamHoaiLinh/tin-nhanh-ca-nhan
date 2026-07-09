import { supabase } from './supabase';
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
export const validateFeed = (url: string) => invoke<FeedValidationResult>('validate-feed', { url });
export const discoverFeed = (url: string) => invoke<{ feeds: Array<FeedValidationResult & { url: string }> }>('discover-feed', { url });
export const scanSource = (sourceId?: string) => invoke<{ scanned: number; inserted: number; duplicates: number; errors: number }>('scan-rss', sourceId ? { sourceId } : { all: true });

export const summarizeArticle = (articleId: string, seed = Date.now()) => invoke<ArticleSummary>('summarize-article', { articleId, seed });
