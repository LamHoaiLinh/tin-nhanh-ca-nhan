import { assertSafeUrl } from './security.ts';
import { extractArticleFromHtml, type ExtractedArticle } from './article-summary.ts';
import { buildHeuristicAlternativeUrls, discoverAlternativeArticleUrls, extractBestArticleFromHtml } from './article-extractor.ts';

export type ArticlePageVariant = 'original' | 'discovered-amp-mobile' | 'heuristic-amp-mobile' | 'rss-description';

export interface ArticleSourceAttempt {
  url: string;
  variant: ArticlePageVariant;
  ok: boolean;
  status?: number;
  method?: string;
  wordCount?: number;
  durationMs: number;
  message: string;
}

export interface ArticleSourceResult {
  article: ExtractedArticle;
  resolvedUrl: string;
  variant: ArticlePageVariant;
  warning: string | null;
  attempts: ArticleSourceAttempt[];
}

interface FetchedPage {
  body: string;
  finalUrl: string;
  status: number;
  contentType: string;
}

interface RequestProfile {
  name: string;
  userAgent: string;
  acceptLanguage: string;
  mobile: boolean;
}

const REQUEST_PROFILES: RequestProfile[] = [
  {
    name: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    acceptLanguage: 'vi-VN,vi;q=0.9,en-US;q=0.7,en;q=0.5',
    mobile: false,
  },
  {
    name: 'mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    acceptLanguage: 'vi-VN,vi;q=0.9,en;q=0.6',
    mobile: true,
  },
];

const RETRYABLE_STATUS = new Set([403, 408, 425, 429, 500, 502, 503, 504]);
const MAX_PAGE_BYTES = 6 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const OVERALL_TIMEOUT_MS = 28_000;

class PageFetchError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'PageFetchError';
  }
}

function countWords(value: string): number {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean ? clean.split(' ').length : 0;
}

function remainingTime(deadline: number, requested: number): number {
  return Math.max(700, Math.min(requested, deadline - Date.now()));
}

function detectCharset(contentType: string, bytes: Uint8Array): string {
  const headerMatch = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1];
  if (headerMatch) return headerMatch.toLowerCase();
  const prefix = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 4096)));
  const metaMatch = prefix.match(/<meta[^>]+charset\s*=\s*["']?([^\s"'/>]+)/i)?.[1]
    ?? prefix.match(/<meta[^>]+content\s*=\s*["'][^"']*charset=([^\s"';>]+)/i)?.[1];
  return metaMatch?.toLowerCase() ?? 'utf-8';
}

function decodeBytes(bytes: Uint8Array, contentType: string): string {
  const declared = detectCharset(contentType, bytes);
  const labels = [declared, 'utf-8', 'windows-1258', 'windows-1252'];
  for (const label of [...new Set(labels)]) {
    try {
      return new TextDecoder(label, { fatal: label === 'utf-8' }).decode(bytes);
    } catch {
      // Thử encoding tiếp theo.
    }
  }
  return new TextDecoder().decode(bytes);
}

function isChallengePage(html: string): boolean {
  const sample = html.slice(0, 80_000).toLowerCase();
  const challengeSignals = [
    'cf-chl-', 'cloudflare ray id', 'checking your browser', 'verify you are human', 'captcha',
    'access denied', 'request blocked', 'enable javascript and cookies', 'bot detection',
  ];
  return challengeSignals.some((signal) => sample.includes(signal)) && countWords(html.replace(/<[^>]+>/g, ' ')) < 220;
}

async function readLimitedBody(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new PageFetchError('Trang bài báo không có nội dung phản hồi.', response.status);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_PAGE_BYTES) {
      await reader.cancel();
      throw new PageFetchError('Trang bài báo vượt quá giới hạn 6 MB.', response.status);
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

async function fetchWithProfile(input: string, profile: RequestProfile, deadline: number, redirects = 0): Promise<FetchedPage> {
  if (redirects > MAX_REDIRECTS) throw new PageFetchError('Bài báo chuyển hướng quá nhiều lần.');
  if (Date.now() >= deadline - 500) throw new PageFetchError('Đã hết thời gian tải toàn văn.');
  const url = await assertSafeUrl(input);
  const controller = new AbortController();
  const timeout = remainingTime(deadline, redirects ? 7_000 : 10_000);
  const timer = setTimeout(() => controller.abort(), timeout);
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': profile.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.7',
        'Accept-Language': profile.acceptLanguage,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        ...(profile.mobile ? { 'Sec-CH-UA-Mobile': '?1' } : { 'Sec-CH-UA-Mobile': '?0' }),
      },
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new PageFetchError(`Trang nguồn phản hồi quá ${Math.ceil(timeout / 1000)} giây.`);
    throw new PageFetchError(`Không thể kết nối trang nguồn: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location');
    if (!location) throw new PageFetchError('Trang nguồn chuyển hướng nhưng thiếu địa chỉ đích.', response.status);
    return fetchWithProfile(new URL(location, url).toString(), profile, deadline, redirects + 1);
  }

  if (!response.ok) throw new PageFetchError(`Website nguồn trả về HTTP ${response.status}.`, response.status);
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.includes('html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml+xml')) {
    throw new PageFetchError(`Nguồn trả về định dạng không phải HTML: ${contentType || 'không xác định'}.`, response.status);
  }

  const bytes = await readLimitedBody(response);
  const body = decodeBytes(bytes, contentType);
  if (body.length < 220) throw new PageFetchError('Trang nguồn trả về nội dung quá ngắn.', response.status);
  if (isChallengePage(body)) throw new PageFetchError('Website nguồn yêu cầu xác minh trình duyệt hoặc chống bot.', response.status);
  return { body, finalUrl: response.url || url.toString(), status: response.status, contentType };
}

async function fetchPage(input: string, deadline: number, preferMobile = false): Promise<FetchedPage> {
  const profiles = preferMobile ? [REQUEST_PROFILES[1]!, REQUEST_PROFILES[0]!] : REQUEST_PROFILES;
  let lastError: unknown = null;
  for (let index = 0; index < profiles.length; index += 1) {
    const profile = profiles[index]!;
    try {
      return await fetchWithProfile(input, profile, deadline);
    } catch (error) {
      lastError = error;
      const status = error instanceof PageFetchError ? error.status : undefined;
      const shouldRetry = index === 0 && Date.now() < deadline - 1_200 && (status === undefined || RETRYABLE_STATUS.has(status));
      if (!shouldRetry) break;
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
  }
  throw lastError instanceof Error ? lastError : new PageFetchError('Không thể tải trang bài báo.');
}

function attemptMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Lỗi không xác định khi lấy bài báo.';
}

function alternativeType(url: string): ArticlePageVariant {
  return /(?:\/amp(?:\/|$)|[?&](?:amp|outputType|output)=)/i.test(url) || /^m\./i.test(new URL(url).hostname)
    ? 'heuristic-amp-mobile'
    : 'discovered-amp-mobile';
}


function userFacingFallbackReason(attempts: ArticleSourceAttempt[]): string {
  const direct = attempts.find((attempt) => attempt.variant === 'original');
  if (!direct) return 'Không nhận diện được toàn văn từ trang nguồn.';
  if (direct.status && direct.status >= 400) return `Website nguồn trả về HTTP ${direct.status}.`;
  if (/xác minh|chống bot|phản hồi quá|không thể kết nối|hết thời gian/i.test(direct.message)) return direct.message;
  if (direct.status === 200) return 'Trang nguồn đã tải được nhưng cấu trúc bài viết chưa cung cấp đủ toàn văn để nhận diện an toàn.';
  return 'Không nhận diện được toàn văn từ trang nguồn.';
}

function bestAlternative<T extends { article: ExtractedArticle; page: FetchedPage; variant: ArticlePageVariant }>(values: T[]): T | null {
  return values.sort((left, right) => {
    const leftWords = countWords(left.article.text);
    const rightWords = countWords(right.article.text);
    const leftParagraphs = left.article.paragraphs.length;
    const rightParagraphs = right.article.paragraphs.length;
    return (rightWords + rightParagraphs * 8) - (leftWords + leftParagraphs * 8);
  })[0] ?? null;
}

export async function loadArticleForSummary(
  originalUrl: string,
  title: string,
  fallbackDescription = '',
): Promise<ArticleSourceResult> {
  const deadline = Date.now() + OVERALL_TIMEOUT_MS;
  const attempts: ArticleSourceAttempt[] = [];
  let directPage: FetchedPage | null = null;

  const directStart = Date.now();
  try {
    directPage = await fetchPage(originalUrl, deadline, false);
    const extracted = extractBestArticleFromHtml(directPage.body, directPage.finalUrl, title, fallbackDescription);
    const words = extracted.article ? countWords(extracted.article.text) : 0;
    attempts.push({
      url: directPage.finalUrl,
      variant: 'original',
      ok: Boolean(extracted.article),
      status: directPage.status,
      method: extracted.method ?? undefined,
      wordCount: words || undefined,
      durationMs: Date.now() - directStart,
      message: extracted.article ? 'Đã lấy toàn văn từ trang gốc.' : extracted.diagnostics.join(' '),
    });
    if (extracted.article) {
      return {
        article: extracted.article,
        resolvedUrl: directPage.finalUrl,
        variant: 'original',
        warning: null,
        attempts,
      };
    }
  } catch (error) {
    attempts.push({
      url: originalUrl,
      variant: 'original',
      ok: false,
      status: error instanceof PageFetchError ? error.status : undefined,
      durationMs: Date.now() - directStart,
      message: attemptMessage(error),
    });
  }

  const discovered = directPage ? discoverAlternativeArticleUrls(directPage.body, directPage.finalUrl) : [];
  const heuristics = buildHeuristicAlternativeUrls(directPage?.finalUrl ?? originalUrl);
  const alternatives = [...new Set([...discovered, ...heuristics])]
    .filter((url) => url !== originalUrl && url !== directPage?.finalUrl)
    .slice(0, 5);

  const successful: Array<{ article: ExtractedArticle; page: FetchedPage; variant: ArticlePageVariant }> = [];
  if (alternatives.length && Date.now() < deadline - 1_200) {
    await Promise.all(alternatives.map(async (url) => {
      const variant = discovered.includes(url) ? 'discovered-amp-mobile' : alternativeType(url);
      const startedAt = Date.now();
      try {
        const page = await fetchPage(url, deadline, true);
        const extracted = extractBestArticleFromHtml(page.body, page.finalUrl, title, fallbackDescription);
        const words = extracted.article ? countWords(extracted.article.text) : 0;
        attempts.push({
          url: page.finalUrl,
          variant,
          ok: Boolean(extracted.article),
          status: page.status,
          method: extracted.method ?? undefined,
          wordCount: words || undefined,
          durationMs: Date.now() - startedAt,
          message: extracted.article ? 'Đã lấy toàn văn từ bản AMP/mobile.' : extracted.diagnostics.join(' '),
        });
        if (extracted.article) successful.push({ article: extracted.article, page, variant });
      } catch (error) {
        attempts.push({
          url,
          variant,
          ok: false,
          status: error instanceof PageFetchError ? error.status : undefined,
          durationMs: Date.now() - startedAt,
          message: attemptMessage(error),
        });
      }
    }));
  }

  const best = bestAlternative(successful);
  if (best) {
    return {
      article: best.article,
      resolvedUrl: best.page.finalUrl,
      variant: best.variant,
      warning: null,
      attempts,
    };
  }

  const fallback = extractArticleFromHtml('', fallbackDescription);
  const failedReason = userFacingFallbackReason(attempts);
  attempts.push({
    url: originalUrl,
    variant: 'rss-description',
    ok: Boolean(fallback.text.trim()),
    method: 'rss-description',
    wordCount: countWords(fallback.text) || undefined,
    durationMs: 0,
    message: 'Chỉ còn mô tả RSS làm dữ liệu dự phòng.',
  });
  return {
    article: fallback,
    resolvedUrl: directPage?.finalUrl ?? originalUrl,
    variant: 'rss-description',
    warning: `${failedReason} Vì vậy hệ thống chỉ hiển thị phần mở đầu từ RSS.`,
    attempts,
  };
}
