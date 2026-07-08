import { describe, expect, it } from 'vitest';
import { decideDuplicate, representativeScore, type DuplicateCandidate } from '../src/algorithms/duplicate';
import { simhash64, simhashToHex } from '../src/algorithms/similarity';
function item(overrides:Partial<DuplicateCandidate>={}):DuplicateCandidate{const title=overrides.normalizedTitle??'nghi dinh moi ve hoa don dien tu doanh nghiep';return{guid:'g1',sourceId:'s1',canonicalUrl:'https://example.com/a',urlHash:'u1',normalizedTitle:title,titleHash:'t1',simhash:simhashToHex(simhash64(title)),publishedAt:'2026-07-08T08:00:00Z',...overrides};}
describe('lọc trùng',()=>{
  it('trùng URL',()=>expect(decideDuplicate(item(),item({guid:'g2'})).duplicate).toBe(true));
  it('khác URL nhưng tiêu đề tương tự',()=>expect(decideDuplicate(item(),item({sourceId:'s2',guid:'g2',canonicalUrl:'https://other.vn/b',urlHash:'u2',normalizedTitle:'nghi dinh moi ve hoa don dien tu cho doanh nghiep'})).duplicate).toBe(true));
  it('nhiều từ chung nhưng khác sự kiện không tự động trùng',()=>expect(decideDuplicate(item(),item({sourceId:'s2',guid:'g9',canonicalUrl:'https://other.vn/c',urlHash:'u3',normalizedTitle:'doanh nghiep nop thue thu nhap quy hai tai ha noi',publishedAt:'2026-07-08T09:00:00Z'})).duplicate).toBe(false));
  it('bài có ảnh và nguồn ưu tiên cao được điểm đại diện tốt hơn',()=>expect(representativeScore({sourcePriority:10,hasImage:true,descriptionLength:400,publishedAt:'2026-07-08T08:00:00Z',validUrlAndDate:true,hasAuthor:true})).toBeGreaterThan(representativeScore({sourcePriority:3,hasImage:false,descriptionLength:20,publishedAt:'2026-07-08T08:00:00Z',validUrlAndDate:true,hasAuthor:false})));
});
