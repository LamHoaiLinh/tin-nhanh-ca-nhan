import { Readability } from '@mozilla/readability';
import { DOMParser } from 'linkedom/worker';
import { extractArticleFromHtml, type ExtractedArticle, type ExtractionMethod } from './article-summary.ts';

export interface ExtractionCandidate extends ExtractedArticle {
  score: number;
  wordCount: number;
  characterCount: number;
}

export interface HtmlExtractionResult {
  article: ExtractedArticle | null;
  method: ExtractionMethod | null;
  diagnostics: string[];
}

const CONTENT_SELECTORS = [
  '[itemprop="articleBody"]',
  '.detail-content',
  '.detail__content',
  '.detail-content-body',
  '.detail-content-afcbc-body',
  '.detail__content-body',
  '.detail-content__body',
  '.article-body',
  '.article__body',
  '.article-content',
  '.article__content',
  '.article-detail',
  '.article-detail-content',
  '.article-content-body',
  '.news-detail-content',
  '.news-detail__content',
  '#news-content',
  '.content-detail',
  '.content_detail',
  '.content-news-detail',
  '.content-body',
  '.cms-body',
  '.fck_detail',
  '.maincontent',
  '.main-content',
  '#main-detail',
  '#article-content',
  '#content-detail',
  '.post-content',
  '.entry-content',
  '.singular-content',
  '.story-body',
  '.story-content',
  '.post-detail__content',
  '.detail__body',
  '.article-main',
  '.article-text',
  '.news-content',
  '.news-detail',
  '.content-news',
  '.article__detail',
];

const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'svg', 'canvas', 'iframe', 'form', 'button', 'nav', 'header', 'footer', 'aside',
  '[aria-hidden="true"]', '.advertisement', '.ads', '.ad', '.banner', '.social', '.share', '.related', '.related-news',
  '.box-related', '.recommend', '.recommended', '.comment', '.comments', '.author-box', '.breadcrumb', '.tag', '.tags',
  '.newsletter', '.subscription', '.audio-player', '.video-player', '.sticky', '.popup', '.modal', '.copyright',
];

const BOILERPLATE = [
  /^(xem|đọc)\s+thêm\b/i,
  /^tin\s+liên\s+quan\b/i,
  /^có\s+thể\s+bạn\s+quan\s+tâm\b/i,
  /^(chia\s+sẻ|bình\s+luận|theo\s+dõi|đăng\s+ký|quảng\s+cáo|hotline|email)\b/i,
  /^(nguồn|ảnh|video|đồ\s+họa)\s*:/i,
  /bản\s+quyền\s+thuộc/i,
  /cookie|privacy|điều\s+khoản\s+sử\s+dụng/i,
  /mời\s+quý\s+vị\s+theo\s+dõi/i,
  /tải\s+ứng\s+dụng/i,
];

function normalizeSpace(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeLoose(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(value: string): number {
  const clean = normalizeSpace(value);
  return clean ? clean.split(/\s+/).length : 0;
}

function isMeaningfulParagraph(value: string): boolean {
  const text = normalizeSpace(value);
  if (text.length < 40 || countWords(text) < 7) return false;
  if (BOILERPLATE.some((pattern) => pattern.test(text))) return false;
  const punctuation = (text.match(/[.!?…,:;]/g) ?? []).length;
  const alpha = (text.match(/[A-Za-zÀ-Ỹà-ỹĐđ]/g) ?? []).length;
  if (alpha < Math.min(28, text.length * 0.45)) return false;
  if (punctuation === 0 && countWords(text) < 14) return false;
  return true;
}

function uniqueParagraphs(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const clean = normalizeSpace(value);
    if (!isMeaningfulParagraph(clean)) continue;
    const key = normalizeLoose(clean).slice(0, 280);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(clean);
  }
  return output;
}

function titleTokens(title: string): Set<string> {
  return new Set(normalizeLoose(title).split(' ').filter((item) => item.length > 2));
}

function titleOverlapScore(title: string, text: string): number {
  const titleWords = titleTokens(title);
  if (!titleWords.size) return 0;
  const contentWords = new Set(normalizeLoose(text).split(' '));
  let matched = 0;
  for (const word of titleWords) if (contentWords.has(word)) matched += 1;
  return matched / titleWords.size;
}

function candidateFromParagraphs(
  method: ExtractionMethod,
  paragraphs: string[],
  title: string,
  fallbackWordCount: number,
  methodBonus: number,
): ExtractionCandidate | null {
  const cleanParagraphs = uniqueParagraphs(paragraphs);
  const text = cleanParagraphs.join('\n\n');
  const wordCount = countWords(text);
  const characterCount = text.length;
  const relativeMinimum = Math.max(75, Math.min(150, Math.round(fallbackWordCount * 1.65)));
  const enoughContent = wordCount >= 145 || (wordCount >= relativeMinimum && cleanParagraphs.length >= 3) || characterCount >= 1_150;
  if (!enoughContent) return null;

  const paragraphBonus = Math.min(24, cleanParagraphs.length) * 1.8;
  const overlapBonus = titleOverlapScore(title, text) * 55;
  const lengthScore = Math.min(450, wordCount) * 0.12;
  const sentenceCount = (text.match(/[.!?…](?:\s|$)/g) ?? []).length;
  const sentenceBonus = Math.min(25, sentenceCount) * 0.8;
  return {
    text,
    paragraphs: cleanParagraphs,
    method,
    score: methodBonus + paragraphBonus + overlapBonus + lengthScore + sentenceBonus,
    wordCount,
    characterCount,
  };
}

function parseDocument(html: string, pageUrl: string): Document | null {
  try {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    if (!parsed) return null;
    const document = parsed as unknown as Document;
    const head = document.head ?? document.querySelector('head');
    if (head && !document.querySelector('base[href]')) {
      const base = document.createElement('base');
      base.setAttribute('href', pageUrl);
      head.prepend(base);
    }
    try {
      Object.defineProperty(document, 'documentURI', { value: pageUrl, configurable: true });
      Object.defineProperty(document, 'URL', { value: pageUrl, configurable: true });
    } catch {
      // LinkeDOM có thể không cho ghi đè thuộc tính URL; Readability vẫn đọc được nội dung chữ.
    }
    return document;
  } catch {
    return null;
  }
}

function removeNoise(root: Document | Element): void {
  for (const selector of NOISE_SELECTORS) {
    try {
      root.querySelectorAll(selector).forEach((node) => node.remove());
    } catch {
      // Bỏ qua selector nếu bộ phân tích DOM không hỗ trợ đầy đủ.
    }
  }
}

function paragraphsFromRoot(root: Document | Element): string[] {
  const values: string[] = [];
  const candidates = root.querySelectorAll('p, h2, h3, blockquote, li');
  candidates.forEach((node) => {
    const element = node as Element;
    if (element.closest('nav,header,footer,aside,form,.related,.comment,.comments,.share,.social,.ads,.advertisement')) return;
    values.push(element.textContent ?? '');
  });

  if (!values.length) {
    root.querySelectorAll('div, section').forEach((node) => {
      const element = node as Element;
      if (element.children.length > 6) return;
      const text = normalizeSpace(element.textContent ?? '');
      if (isMeaningfulParagraph(text) && countWords(text) <= 130) values.push(text);
    });
  }
  return uniqueParagraphs(values);
}

function jsonLdCandidate(html: string, title: string, fallbackWordCount: number): ExtractionCandidate | null {
  const legacy = extractArticleFromHtml(html, '');
  if (legacy.method !== 'json-ld') return null;
  return candidateFromParagraphs('json-ld', legacy.paragraphs, title, fallbackWordCount, 120);
}

function readabilityCandidate(document: Document, title: string, fallbackWordCount: number): ExtractionCandidate | null {
  try {
    const clone = document.cloneNode(true) as Document;
    removeNoise(clone);
    const parsed = new Readability(clone, {
      charThreshold: 280,
      nbTopCandidates: 10,
      maxElemsToParse: 80_000,
      keepClasses: false,
      disableJSONLD: true,
    }).parse();
    if (!parsed) return null;

    let paragraphs: string[] = [];
    if (parsed.content) {
      const contentDocument = parseDocument(`<html><body>${parsed.content}</body></html>`, 'https://reader.local/');
      if (contentDocument) paragraphs = paragraphsFromRoot(contentDocument.body);
    }
    if (!paragraphs.length && parsed.textContent) {
      paragraphs = uniqueParagraphs(
        normalizeSpace(parsed.textContent)
          .split(/\n{2,}|(?<=[.!?…])\s+(?=[A-ZÀ-ỸĐ“])/u),
      );
    }
    return candidateFromParagraphs('readability', paragraphs, title, fallbackWordCount, 105);
  } catch {
    return null;
  }
}

function selectorCandidate(document: Document, title: string, fallbackWordCount: number): ExtractionCandidate | null {
  const candidates: ExtractionCandidate[] = [];
  CONTENT_SELECTORS.forEach((selector, index) => {
    try {
      document.querySelectorAll(selector).forEach((node) => {
        const clone = node.cloneNode(true) as Element;
        removeNoise(clone);
        const paragraphs = paragraphsFromRoot(clone);
        const candidate = candidateFromParagraphs('site-selector', paragraphs, title, fallbackWordCount, 92 - Math.min(28, index));
        if (candidate) candidates.push(candidate);
      });
    } catch {
      // Bỏ qua selector lỗi.
    }
  });

  const positivePattern = /(article|detail|content|story|post|news|body|main|entry|fck|cms)/i;
  const negativePattern = /(related|comment|share|social|footer|header|menu|nav|sidebar|recommend|advert|banner|popup)/i;
  try {
    Array.from(document.querySelectorAll('article, main, [role="main"], section, div')).slice(0, 2500).forEach((node) => {
      const element = node as Element;
      const signature = `${element.id} ${element.className}`;
      if (!positivePattern.test(signature) || negativePattern.test(signature)) return;
      const clone = element.cloneNode(true) as Element;
      removeNoise(clone);
      const paragraphs = paragraphsFromRoot(clone);
      const candidate = candidateFromParagraphs('site-selector', paragraphs, title, fallbackWordCount, 55);
      if (!candidate) return;
      const linkText = [...clone.querySelectorAll('a')].reduce((sum, link) => sum + normalizeSpace(link.textContent ?? '').length, 0);
      const totalText = normalizeSpace(clone.textContent ?? '').length;
      const linkDensity = totalText ? linkText / totalText : 1;
      candidate.score -= Math.min(55, linkDensity * 95);
      candidates.push(candidate);
    });
  } catch {
    // Bộ DOM không hỗ trợ một selector nào đó.
  }

  return candidates.sort((left, right) => right.score - left.score)[0] ?? null;
}

function legacyCandidate(html: string, title: string, fallbackWordCount: number): ExtractionCandidate | null {
  const legacy = extractArticleFromHtml(html, '');
  if (legacy.method === 'rss-description' || legacy.method === 'json-ld') return null;
  return candidateFromParagraphs(legacy.method, legacy.paragraphs, title, fallbackWordCount, 45);
}

export function extractBestArticleFromHtml(
  html: string,
  pageUrl: string,
  title: string,
  fallbackDescription = '',
): HtmlExtractionResult {
  const diagnostics: string[] = [];
  const fallbackWordCount = countWords(fallbackDescription);

  const jsonLd = jsonLdCandidate(html, title, fallbackWordCount);
  if (jsonLd) return { article: jsonLd, method: jsonLd.method, diagnostics: ['JSON-LD articleBody hợp lệ.'] };
  diagnostics.push('JSON-LD không có articleBody đủ dài.');

  const document = parseDocument(html, pageUrl);
  if (document) {
    const readability = readabilityCandidate(document, title, fallbackWordCount);
    if (readability) return { article: readability, method: readability.method, diagnostics: [...diagnostics, 'Mozilla Readability nhận diện được toàn văn.'] };
    diagnostics.push('Mozilla Readability không nhận diện được nội dung đủ dài.');

    const siteSpecific = selectorCandidate(document, title, fallbackWordCount);
    if (siteSpecific) return { article: siteSpecific, method: siteSpecific.method, diagnostics: [...diagnostics, 'Đã lấy nội dung bằng vùng bài viết phổ biến.'] };
    diagnostics.push('Các vùng nội dung phổ biến không đạt ngưỡng chất lượng.');
  } else {
    diagnostics.push('Không phân tích được DOM của trang.');
  }

  const legacy = legacyCandidate(html, title, fallbackWordCount);
  if (legacy) return { article: legacy, method: legacy.method, diagnostics: [...diagnostics, 'Đã dùng bộ trích xuất HTML dự phòng.'] };
  diagnostics.push('Bộ trích xuất HTML dự phòng không đủ nội dung.');

  return { article: null, method: null, diagnostics };
}

export function discoverAlternativeArticleUrls(html: string, pageUrl: string): string[] {
  const document = parseDocument(html, pageUrl);
  if (!document) return [];
  const base = new URL(pageUrl);
  const urls: string[] = [];
  const add = (value: string | null): void => {
    if (!value) return;
    try {
      const candidate = new URL(value, base);
      if (!['http:', 'https:'].includes(candidate.protocol)) return;
      if (!sameSite(base.hostname, candidate.hostname)) return;
      const normalized = candidate.toString();
      if (normalized !== base.toString() && !urls.includes(normalized)) urls.push(normalized);
    } catch {
      // URL không hợp lệ.
    }
  };

  document.querySelectorAll('link[rel~="amphtml"], link[rel~="alternate"]').forEach((node) => {
    const element = node as Element;
    const media = (element.getAttribute('media') ?? '').toLowerCase();
    const type = (element.getAttribute('type') ?? '').toLowerCase();
    const rel = (element.getAttribute('rel') ?? '').toLowerCase();
    if (rel.includes('amphtml') || media.includes('max-width') || media.includes('handheld') || type.includes('mobile')) {
      add(element.getAttribute('href'));
    }
  });

  return urls.slice(0, 4);
}

export function buildHeuristicAlternativeUrls(pageUrl: string): string[] {
  let base: URL;
  try { base = new URL(pageUrl); } catch { return []; }
  const output: string[] = [];
  const add = (url: URL): void => {
    const value = url.toString();
    if (value !== base.toString() && !output.includes(value)) output.push(value);
  };

  if (!base.pathname.startsWith('/amp/')) {
    const ampPath = new URL(base.toString());
    ampPath.pathname = `/amp${base.pathname.startsWith('/') ? '' : '/'}${base.pathname}`.replace(/\/+/g, '/');
    add(ampPath);
  }

  for (const [key, value] of [['amp', '1'], ['outputType', 'amp'], ['output', '1']] as const) {
    const candidate = new URL(base.toString());
    candidate.searchParams.set(key, value);
    add(candidate);
  }

  if (!base.hostname.startsWith('m.') && base.hostname.split('.').length >= 2) {
    const mobile = new URL(base.toString());
    const bareHost = base.hostname.replace(/^www\./i, '');
    mobile.hostname = `m.${bareHost}`;
    add(mobile);
  }

  return output.slice(0, 4);
}

function sameSite(left: string, right: string): boolean {
  const root = (hostname: string): string => {
    const parts = hostname.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
    const suffix2 = parts.slice(-2).join('.');
    const multiPartSuffixes = new Set(['com.vn', 'net.vn', 'org.vn', 'gov.vn', 'edu.vn', 'co.uk', 'com.au']);
    return multiPartSuffixes.has(suffix2) && parts.length >= 3
      ? parts.slice(-3).join('.')
      : suffix2;
  };
  return left.toLowerCase() === right.toLowerCase() || root(left) === root(right);
}
