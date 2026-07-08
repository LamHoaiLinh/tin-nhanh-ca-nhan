export interface FeedImageFields { mediaContent?: unknown; mediaThumbnail?: unknown; enclosure?: unknown; content?: string; description?: string; sourceLogo?: string | null; placeholder?: string; }
function firstUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return /^https?:\/\//i.test(value) ? value : null;
  if (Array.isArray(value)) for (const item of value) { const found = firstUrl(item); if (found) return found; }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['url', '@_url', 'href', '@_href']) { const found = firstUrl(record[key]); if (found) return found; }
  }
  return null;
}
function firstImageInHtml(html?: string): string | null { return html?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null; }
export function chooseArticleImage(fields: FeedImageFields): string {
  return firstUrl(fields.mediaContent) ?? firstUrl(fields.mediaThumbnail) ?? firstUrl(fields.enclosure) ?? firstImageInHtml(fields.content) ?? firstImageInHtml(fields.description) ?? fields.sourceLogo ?? fields.placeholder ?? '/placeholder-news.svg';
}
