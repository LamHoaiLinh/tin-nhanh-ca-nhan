import { normalizeForSearch } from './text';

export type RuleType = 'positive' | 'negative' | 'required';
export type TargetField = 'title' | 'description' | 'all';
export interface KeywordRule { keyword: string; rule_type: RuleType; target_field: TargetField; weight: number; enabled: boolean; }
export interface ScoreInput {
  title: string; description: string; category: string; sourcePriority: number; publishedAt: string;
  hasImage: boolean; hasAuthor: boolean; isHttps: boolean; categoryWeight: number; halfLifeHours: number;
  rules: KeywordRule[];
}
export interface ScoreBreakdown { category: number; keywords: number; source: number; freshness: number; quality: number; negative: number; total: number; matchedKeywords: string[]; hidden: boolean; }

function includesPhrase(haystack: string, keyword: string): boolean { return haystack.includes(normalizeForSearch(keyword)); }
export function freshnessScore(publishedAt: string, halfLifeHours: number, now = new Date()): number {
  const ageHours = Math.max(0, (now.getTime() - new Date(publishedAt).getTime()) / 3_600_000);
  return 20 * Math.exp(-ageHours / Math.max(1, halfLifeHours));
}

export function scoreArticle(input: ScoreInput, now = new Date()): ScoreBreakdown {
  const title = normalizeForSearch(input.title);
  const description = normalizeForSearch(input.description);
  let positive = 0;
  let negative = 0;
  let hidden = false;
  const matched = new Set<string>();
  for (const rule of input.rules.filter((r) => r.enabled)) {
    const keyword = normalizeForSearch(rule.keyword);
    const inTitle = rule.target_field !== 'description' && title.includes(keyword);
    const inDescription = rule.target_field !== 'title' && description.includes(keyword);
    if (!inTitle && !inDescription) {
      if (rule.rule_type === 'required') hidden = true;
      continue;
    }
    matched.add(rule.keyword);
    const exactBonus = rule.keyword.trim().includes(' ') ? 1.2 : 1;
    if (rule.rule_type === 'positive' || rule.rule_type === 'required') positive += ((inTitle ? rule.weight * 3 : 0) + (inDescription ? rule.weight : 0)) * exactBonus;
    if (rule.rule_type === 'negative') {
      if (rule.weight >= 100) hidden = true;
      negative += (inTitle ? rule.weight * 5 : 0) + (inDescription ? rule.weight * 2 : 0);
    }
  }
  const category = Math.max(0, Math.min(25, input.categoryWeight / 10 * 25));
  const source = Math.max(0, Math.min(15, input.sourcePriority / 10 * 15));
  const freshness = freshnessScore(input.publishedAt, input.halfLifeHours, now);
  let quality = 0;
  if (input.hasImage) quality += 2;
  if (input.description.length > 100) quality += 2;
  if (!Number.isNaN(new Date(input.publishedAt).getTime())) quality += 2;
  if (input.hasAuthor) quality += 1;
  if (input.isHttps) quality += 1;
  if (!/(sốc|kinh hoàng|không thể tin|giật mình|chấn động)/i.test(input.title)) quality += 2;
  const total = hidden ? 0 : Math.max(0, Math.min(100, category + Math.min(30, positive) + source + freshness + quality - negative));
  return { category, keywords: Math.min(30, positive), source, freshness, quality, negative, total, matchedKeywords: [...matched], hidden };
}

export function defaultHalfLife(category: string): number {
  const normalized = normalizeForSearch(category);
  if (/(thue|ke toan|phap luat|hoa don|bao hiem)/.test(normalized)) return 120;
  if (/(cong nghe|ai|tu dong hoa|excel|vba|python)/.test(normalized)) return 72;
  if (/(huong dan|ky nang|giao duc)/.test(normalized)) return 240;
  return 24;
}
