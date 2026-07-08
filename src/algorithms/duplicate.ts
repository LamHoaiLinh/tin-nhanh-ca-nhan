import { cosineSimilarityNgrams, hammingDistance, jaccardSimilarity, simhashFromHex } from './similarity';
import { tokenize } from './text';

export interface DuplicateCandidate {
  guid?: string | null;
  sourceId?: string;
  canonicalUrl: string;
  urlHash: string;
  normalizedTitle: string;
  titleHash: string;
  simhash: string;
  publishedAt: string;
}

export interface DuplicateDecision { duplicate: boolean; reason: string; jaccard: number; cosine: number; hamming: number; }

export function decideDuplicate(a: DuplicateCandidate, b: DuplicateCandidate): DuplicateDecision {
  const hours = Math.abs(new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()) / 3_600_000;
  if (a.guid && b.guid && a.sourceId === b.sourceId && a.guid === b.guid) return { duplicate: true, reason: 'same-guid', jaccard: 1, cosine: 1, hamming: 0 };
  if (a.canonicalUrl === b.canonicalUrl || a.urlHash === b.urlHash) return { duplicate: true, reason: 'same-url', jaccard: 1, cosine: 1, hamming: 0 };
  if (a.normalizedTitle === b.normalizedTitle && hours <= 168) return { duplicate: true, reason: 'same-title', jaccard: 1, cosine: 1, hamming: 0 };
  const tokensA = tokenize(a.normalizedTitle);
  const tokensB = tokenize(b.normalizedTitle);
  const jac = jaccardSimilarity(tokensA, tokensB);
  const cosine = cosineSimilarityNgrams(a.normalizedTitle, b.normalizedTitle, 3);
  const hamming = hammingDistance(simhashFromHex(a.simhash), simhashFromHex(b.simhash));
  const meaningfulTokens = Math.min(new Set(tokensA).size, new Set(tokensB).size);
  const duplicate = hours <= 72 && (
    (hamming <= 3 && jac >= 0.82 && meaningfulTokens >= 5) ||
    (jac >= 0.90 && meaningfulTokens >= 5) ||
    (cosine >= 0.92 && hours <= 24)
  );
  return { duplicate, reason: duplicate ? 'similar-content' : 'different', jaccard: jac, cosine, hamming };
}

export interface RepresentativeInput { sourcePriority: number; hasImage: boolean; descriptionLength: number; publishedAt: string; validUrlAndDate: boolean; hasAuthor: boolean; }
export function representativeScore(input: RepresentativeInput, earliestPublishedAt?: string): number {
  const priority = Math.max(0, Math.min(10, input.sourcePriority)) / 10;
  const description = Math.min(20, input.descriptionLength / 20);
  const ageHours = earliestPublishedAt ? Math.max(0, (new Date(input.publishedAt).getTime() - new Date(earliestPublishedAt).getTime()) / 3_600_000) : 0;
  const early = Math.max(0, 15 - Math.min(15, ageHours));
  return 30 * priority + (input.hasImage ? 20 : 0) + description + early + (input.validUrlAndDate ? 10 : 0) + (input.hasAuthor ? 5 : 0);
}
