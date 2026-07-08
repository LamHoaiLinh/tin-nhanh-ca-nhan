import { tokenize } from './text';

export function jaccardSimilarity(a: string | string[], b: string | string[]): number {
  const left = new Set(Array.isArray(a) ? a : tokenize(a));
  const right = new Set(Array.isArray(b) ? b : tokenize(b));
  if (!left.size && !right.size) return 1;
  const intersection = [...left].filter((x) => right.has(x)).length;
  return intersection / new Set([...left, ...right]).size;
}

export function characterNgrams(value: string, n = 3): Map<string, number> {
  const clean = ` ${value.replace(/\s+/g, ' ').trim()} `;
  const grams = new Map<string, number>();
  for (let i = 0; i <= clean.length - n; i += 1) {
    const gram = clean.slice(i, i + n);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

export function cosineSimilarityNgrams(a: string, b: string, n = 3): number {
  const left = characterNgrams(a, n);
  const right = characterNgrams(b, n);
  if (!left.size || !right.size) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const value of left.values()) leftNorm += value * value;
  for (const value of right.values()) rightNorm += value * value;
  for (const [key, value] of left) dot += value * (right.get(key) ?? 0);
  return dot / Math.sqrt(leftNorm * rightNorm);
}

function fnv1a64(value: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash;
}

export function simhash64(value: string): bigint {
  const vector = Array<number>(64).fill(0);
  const terms = tokenize(value, false);
  for (const term of terms) {
    const hash = fnv1a64(term);
    for (let bit = 0; bit < 64; bit += 1) {
      vector[bit] = (vector[bit] ?? 0) + (((hash >> BigInt(bit)) & 1n) === 1n ? 1 : -1);
    }
  }
  let result = 0n;
  for (let bit = 0; bit < 64; bit += 1) if ((vector[bit] ?? 0) >= 0) result |= 1n << BigInt(bit);
  return BigInt.asUintN(64, result);
}

export function simhashToHex(hash: bigint): string { return BigInt.asUintN(64, hash).toString(16).padStart(16, '0'); }
export function simhashFromHex(hash: string): bigint { return BigInt(`0x${hash}`); }

export function hammingDistance(a: bigint, b: bigint): number {
  let value = BigInt.asUintN(64, a ^ b);
  let distance = 0;
  while (value) { distance += Number(value & 1n); value >>= 1n; }
  return distance;
}
