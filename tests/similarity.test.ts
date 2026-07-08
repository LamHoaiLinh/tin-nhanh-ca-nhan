import { describe, expect, it } from 'vitest';
import { cosineSimilarityNgrams, hammingDistance, jaccardSimilarity, simhash64 } from '../src/algorithms/similarity';
describe('độ tương đồng',()=>{
  it('Jaccard đúng',()=>expect(jaccardSimilarity(['a','b','c'],['b','c','d'])).toBeCloseTo(0.5));
  it('character 3-gram cao với tiêu đề gần giống',()=>expect(cosineSimilarityNgrams('nghi dinh moi ve thue doanh nghiep','nghi dinh moi quy dinh thue doanh nghiep')).toBeGreaterThan(0.7));
  it('simhash giống nhau có khoảng cách 0',()=>{const hash=simhash64('hoa don dien tu doanh nghiep');expect(hammingDistance(hash,hash)).toBe(0);});
});
