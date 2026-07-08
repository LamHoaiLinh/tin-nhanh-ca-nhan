const PREFIXES = [
  'tin mới', 'tin nóng', 'mới nhất', 'cập nhật', 'video', 'ảnh', 'trực tiếp', 'breaking news',
];
const STOPWORDS = new Set([
  'va','la','cua','co','cho','trong','voi','duoc','tai','mot','nhung','cac','khi','da','se','ve','theo','nay','den','tren','sau','truoc','do','bi','dang','ra','lai','nhieu','them',
]);
const ENTITY_MAP: Record<string,string> = { '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' ' };

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/gi, (m) => ENTITY_MAP[m.toLowerCase()] ?? ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

export function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

export function removeVietnameseDiacritics(value: string): string {
  return value.replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/\p{M}/gu, '');
}

export function normalizeForSearch(value: string): string {
  return removeVietnameseDiacritics(stripHtml(value).normalize('NFKC').toLowerCase())
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeComparisonTitle(value: string): string {
  let normalized = normalizeForSearch(value);
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of PREFIXES.map(normalizeForSearch)) {
      if (normalized === prefix || normalized.startsWith(`${prefix} `)) {
        normalized = normalized.slice(prefix.length).trim();
        changed = true;
      }
    }
  }
  return tokenize(normalized, true).join(' ');
}

export function tokenize(value: string, removeStopwords = true): string[] {
  const normalized = normalizeForSearch(value);
  return normalized.split(' ').filter((token) => token.length > 1 && (!removeStopwords || !STOPWORDS.has(token)));
}

export function sanitizeDescription(value: string, maxLength = 1200): string {
  return stripHtml(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export { STOPWORDS, PREFIXES };
