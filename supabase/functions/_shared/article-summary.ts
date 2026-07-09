export interface ExtractedArticle {
  text: string;
  paragraphs: string[];
  method: 'json-ld' | 'article' | 'main' | 'paragraphs' | 'rss-description';
}

export interface SummaryResult {
  paragraphs: string[];
  originalWordCount: number;
  summaryWordCount: number;
  compressionRatio: number;
  selectedSentenceCount: number;
}

interface SentenceCandidate {
  index: number;
  text: string;
  words: string[];
  rawWordCount: number;
  score: number;
  paragraphIndex: number;
}

const STOPWORDS = new Set([
  'a','ai','anh','ba','bà','bài','bạn','bằng','bị','biết','bởi','cả','các','cái','cần','chỉ','cho','chưa','chúng','có','còn','cũng','của','đã','đang','đây','để','đến','đều','được','do','đó','đối','gì','giữa','hai','hay','hơn','khi','không','là','lại','làm','lên','lúc','mà','một','này','nên','nếu','người','những','như','nhưng','nhiều','ở','phải','qua','ra','rằng','rất','rồi','sau','sẽ','so','sự','tại','theo','thì','trên','trong','trước','từ','từng','và','vẫn','về','vì','với','vừa','đi','được','đang','cùng','nơi','năm','ngày','tháng','ông','bà','họ','mình','nó','ta','tôi','chúng tôi','công ty','thành phố'
]);

const BOILERPLATE_PATTERNS = [
  /^(xem|đọc)\s+thêm/i,
  /^tin\s+liên\s+quan/i,
  /^có\s+thể\s+bạn\s+quan\s+tâm/i,
  /^(chia\s+sẻ|bình\s+luận|theo\s+dõi|đăng\s+ký|quảng\s+cáo|hotline|email)\b/i,
  /^(nguồn|ảnh|video|đồ\s+họa)\s*:/i,
  /bản\s+quyền\s+thuộc/i,
  /cookie|privacy|điều\s+khoản\s+sử\s+dụng/i,
];

const CONNECTORS = {
  addition: ['Bên cạnh đó,', 'Đồng thời,', 'Mặt khác,', 'Cùng với đó,'],
  contrast: ['Tuy vậy,', 'Ở chiều ngược lại,', 'Dẫu vậy,', 'Trong khi đó,'],
  consequence: ['Từ đó,', 'Vì thế,', 'Hệ quả là', 'Theo mạch diễn biến này,'],
  context: ['Trong bối cảnh ấy,', 'Trước diễn biến này,', 'Ở giai đoạn tiếp theo,', 'Cùng thời điểm,'],
  emphasis: ['Đáng chú ý,', 'Một điểm cần lưu ý là', 'Về tổng thể,', 'Ở phần cuối,'],
};

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', copy: '©',
  };
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

function cleanText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
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

function wordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function meaningfulParagraph(value: string): boolean {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < 45 || wordCount(text) < 8) return false;
  if (BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  const linkLike = (text.match(/https?:\/\//g) ?? []).length;
  return linkLike < 2;
}

function uniqueParagraphs(paragraphs: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const paragraph of paragraphs) {
    const clean = cleanText(paragraph).replace(/\s+/g, ' ').trim();
    if (!meaningfulParagraph(clean)) continue;
    const key = normalizeLoose(clean).slice(0, 260);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function collectJsonLdBodies(html: string): string[] {
  const bodies: string[] = [];
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const visit = (value: unknown): void => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.articleBody === 'string') bodies.push(record.articleBody);
    for (const child of Object.values(record)) visit(child);
  };
  for (const match of scripts) {
    const raw = decodeHtmlEntities((match[1] ?? '').trim()).replace(/^\s*<!--|-->\s*$/g, '');
    if (!raw) continue;
    try {
      visit(JSON.parse(raw));
    } catch {
      const direct = raw.match(/"articleBody"\s*:\s*"((?:\\.|[^"\\])*)"/i)?.[1];
      if (direct) {
        try { bodies.push(JSON.parse(`"${direct}"`) as string); } catch { /* bo qua JSON-LD loi */ }
      }
    }
  }
  return bodies;
}

function extractParagraphsFromBlock(block: string): string[] {
  const withoutNoise = block
    .replace(/<(script|style|noscript|svg|form|button|nav|header|footer|aside|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ');
  return [...withoutNoise.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => match[1] ?? '');
}

function longestTagBlock(html: string, tag: 'article' | 'main'): string {
  const blocks = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map((match) => match[1] ?? '');
  return blocks.sort((a, b) => cleanText(b).length - cleanText(a).length)[0] ?? '';
}

export function extractArticleFromHtml(html: string, fallbackDescription = ''): ExtractedArticle {
  const jsonLd = collectJsonLdBodies(html)
    .map((body) => cleanText(body))
    .filter((body) => body.length >= 300)
    .sort((a, b) => b.length - a.length)[0];
  if (jsonLd) {
    const paragraphs = uniqueParagraphs(jsonLd.split(/\n{2,}|(?<=[.!?…])\s+(?=[A-ZÀ-ỸĐ“])/u));
    return { text: paragraphs.join('\n\n') || jsonLd, paragraphs: paragraphs.length ? paragraphs : [jsonLd], method: 'json-ld' };
  }

  const articleBlock = longestTagBlock(html, 'article');
  const articleParagraphs = uniqueParagraphs(extractParagraphsFromBlock(articleBlock));
  if (articleParagraphs.join(' ').length >= 350) return { text: articleParagraphs.join('\n\n'), paragraphs: articleParagraphs, method: 'article' };

  const mainBlock = longestTagBlock(html, 'main');
  const mainParagraphs = uniqueParagraphs(extractParagraphsFromBlock(mainBlock));
  if (mainParagraphs.join(' ').length >= 350) return { text: mainParagraphs.join('\n\n'), paragraphs: mainParagraphs, method: 'main' };

  const allParagraphs = uniqueParagraphs(extractParagraphsFromBlock(html));
  if (allParagraphs.join(' ').length >= 250) return { text: allParagraphs.join('\n\n'), paragraphs: allParagraphs, method: 'paragraphs' };

  const fallback = cleanText(fallbackDescription);
  return { text: fallback, paragraphs: fallback ? [fallback] : [], method: 'rss-description' };
}

function splitSentences(paragraph: string): string[] {
  const clean = paragraph.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  try {
    const segmenter = new Intl.Segmenter('vi', { granularity: 'sentence' });
    return [...segmenter.segment(clean)].map((item) => item.segment.trim()).filter((item) => wordCount(item) >= 5);
  } catch {
    return clean.split(/(?<=[.!?…])\s+(?=[A-ZÀ-ỸĐ“])/u).map((item) => item.trim()).filter((item) => wordCount(item) >= 5);
  }
}

function tokens(value: string): string[] {
  return normalizeLoose(value).split(' ').filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

function jaccard(a: string[], b: string[]): number {
  const left = new Set(a); const right = new Set(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection++;
  return intersection / (left.size + right.size - intersection);
}

function hasAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function classifyRelation(sentence: string): keyof typeof CONNECTORS {
  const normalized = normalizeLoose(sentence).slice(0, 90);
  if (hasAny(normalized, [/\bnhung\b/, /\btuy nhien\b/, /\bsong\b/, /\btrai lai\b/, /\bdu vay\b/])) return 'contrast';
  if (hasAny(normalized, [/\bdo do\b/, /\bvi vay\b/, /\bvi the\b/, /\bhe qua\b/, /\bhieu qua\b/, /\bkeo theo\b/, /\bdan den\b/])) return 'consequence';
  if (hasAny(normalized, [/\btrong khi\b/, /\btruoc do\b/, /\bhien nay\b/, /\bcung luc\b/, /\bvao luc\b/])) return 'context';
  if (hasAny(normalized, [/\bdang chu y\b/, /\bquan trong\b/, /\bthen chot\b/, /\bnoi bat\b/])) return 'emphasis';
  return 'addition';
}

function startsWithConnector(sentence: string): boolean {
  return /^(tuy nhiên|nhưng|song|do đó|vì vậy|vì thế|ngoài ra|đồng thời|bên cạnh đó|trong khi đó|trước đó|đáng chú ý|mặt khác|theo đó|cụ thể|đặc biệt)[,\s]/i.test(sentence);
}

function randomItem<T>(items: T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
}

function sentenceCaseAfterConnector(sentence: string): string {
  if (!sentence) return sentence;
  return sentence.charAt(0).toLocaleLowerCase('vi') + sentence.slice(1);
}

function addConnector(sentence: string, relation: keyof typeof CONNECTORS, random: () => number): string {
  if (startsWithConnector(sentence)) return sentence;
  const connector = randomItem(CONNECTORS[relation], random);
  return `${connector} ${sentenceCaseAfterConnector(sentence)}`;
}

function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function summarizeArticleText(title: string, paragraphs: string[], seed = Date.now()): SummaryResult {
  const cleanParagraphs = uniqueParagraphs(paragraphs);
  const originalText = cleanParagraphs.join(' ');
  const originalWordCount = wordCount(originalText);
  if (!originalWordCount) return { paragraphs: [], originalWordCount: 0, summaryWordCount: 0, compressionRatio: 0, selectedSentenceCount: 0 };

  const candidates: SentenceCandidate[] = [];
  cleanParagraphs.forEach((paragraph, paragraphIndex) => {
    splitSentences(paragraph).forEach((sentence) => {
      const sentenceWords = tokens(sentence);
      candidates.push({ index: candidates.length, text: sentence, words: sentenceWords, rawWordCount: wordCount(sentence), score: 0, paragraphIndex });
    });
  });

  if (candidates.length <= 3) {
    const text = candidates.map((item) => item.text).join(' ') || originalText;
    return { paragraphs: [text], originalWordCount, summaryWordCount: wordCount(text), compressionRatio: wordCount(text) / originalWordCount, selectedSentenceCount: candidates.length };
  }

  const frequencies = new Map<string, number>();
  for (const candidate of candidates) for (const word of new Set(candidate.words)) frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  const titleWords = new Set(tokens(title));
  const total = candidates.length;

  for (const candidate of candidates) {
    const frequencyScore = candidate.words.reduce((sum, word) => sum + Math.log1p(frequencies.get(word) ?? 0), 0) / Math.max(1, Math.sqrt(candidate.words.length));
    const titleOverlap = candidate.words.filter((word) => titleWords.has(word)).length / Math.max(1, titleWords.size);
    const positionRatio = candidate.index / Math.max(1, total - 1);
    const positionScore = positionRatio < 0.16 ? 1.35 - positionRatio : positionRatio > 0.82 ? 0.7 : 0.15;
    const lengthScore = candidate.rawWordCount >= 12 && candidate.rawWordCount <= 42 ? 0.8 : candidate.rawWordCount < 8 || candidate.rawWordCount > 65 ? -0.8 : 0.15;
    const evidenceScore = /\d|%|tỷ|triệu|nghìn|theo|cho biết|nhận định|khẳng định|cảnh báo|đề xuất|tranh luận|ý kiến/i.test(candidate.text) ? 0.55 : 0;
    const contrastScore = /nhưng|tuy nhiên|song|trái lại|dù|mặc dù|trong khi/i.test(candidate.text) ? 0.5 : 0;
    const quoteScore = /[“”"]/.test(candidate.text) ? 0.25 : 0;
    candidate.score = frequencyScore + titleOverlap * 3.2 + positionScore + lengthScore + evidenceScore + contrastScore + quoteScore;
  }

  const targetWords = Math.max(75, Math.min(1200, Math.round(originalWordCount * 0.3)));
  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const selected: SentenceCandidate[] = [];
  let selectedWords = 0;
  const addSelected = (candidate: SentenceCandidate | undefined): void => {
    if (!candidate || selected.some((item) => item.index === candidate.index)) return;
    const redundancy = selected.reduce((max, item) => Math.max(max, jaccard(candidate.words, item.words)), 0);
    if (redundancy > 0.66) return;
    selected.push(candidate);
    selectedWords += candidate.rawWordCount;
  };

  const leadPool = candidates.slice(0, Math.max(2, Math.ceil(total * 0.18))).sort((a, b) => b.score - a.score);
  const criticalBonus = (candidate: SentenceCandidate): number => {
    let bonus = 0;
    if (/\d|%|tỷ|triệu|nghìn/i.test(candidate.text)) bonus += 1.2;
    if (/theo số liệu|cho biết|nhận định|khẳng định|cảnh báo|lo ngại|đề nghị|tranh luận|ý kiến/i.test(candidate.text)) bonus += 1.15;
    if (/nhưng|tuy nhiên|song|trái lại|trong khi|mặc dù/i.test(candidate.text)) bonus += 0.9;
    return bonus;
  };
  const middlePool = candidates.slice(Math.max(1, Math.floor(total * 0.25)), Math.max(2, Math.ceil(total * 0.8))).sort((a, b) => (b.score + criticalBonus(b)) - (a.score + criticalBonus(a)));
  const endingPool = candidates.slice(Math.floor(total * 0.78)).sort((a, b) => b.score - a.score);
  addSelected(leadPool[0]);
  addSelected(middlePool[0]);
  addSelected(endingPool[0]);

  for (const candidate of ranked) {
    if (selectedWords >= targetWords && selected.length >= 3) break;
    addSelected(candidate);
  }

  const ordered = selected.sort((a, b) => a.index - b.index);
  while (ordered.length > 3 && ordered.reduce((sum, item) => sum + item.rawWordCount, 0) > Math.round(originalWordCount * 0.35)) {
    const removable = ordered
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => index !== 0 && index !== ordered.length - 1)
      .sort((a, b) => a.item.score - b.item.score)[0];
    if (!removable) break;
    ordered.splice(removable.index, 1);
  }

  const random = seededRandom(seed);
  const connected = ordered.map((candidate, index) => index === 0 ? candidate.text : addConnector(candidate.text, classifyRelation(candidate.text), random));
  const output: string[] = [];
  if (connected.length === 1) output.push(connected[0]!);
  else if (connected.length === 2) output.push(connected.join(' '));
  else if (connected.length === 3) { output.push(connected[0]!); output.push(connected.slice(1).join(' ')); }
  else if (connected.length === 4) { output.push(connected[0]!); output.push(connected.slice(1, 3).join(' ')); output.push(connected[3]!); }
  else {
    const paragraphSize = connected.length >= 8 ? 3 : 2;
    for (let index = 0; index < connected.length; index += paragraphSize) output.push(connected.slice(index, index + paragraphSize).join(' '));
  }
  const summaryWordCount = wordCount(output.join(' '));
  return {
    paragraphs: output,
    originalWordCount,
    summaryWordCount,
    compressionRatio: originalWordCount ? summaryWordCount / originalWordCount : 0,
    selectedSentenceCount: ordered.length,
  };
}
