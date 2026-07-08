import { describe, expect, it } from 'vitest';
import { freshnessScore, scoreArticle } from '../src/algorithms/scoring';
const base={title:'Quy định mới về hóa đơn điện tử',description:'Hướng dẫn chi tiết cho doanh nghiệp áp dụng hóa đơn điện tử từ tháng 7.',category:'Hóa đơn điện tử',sourcePriority:8,publishedAt:'2026-07-08T08:00:00Z',hasImage:true,hasAuthor:true,isHttps:true,categoryWeight:10,halfLifeHours:120,rules:[]};
describe('chấm điểm',()=>{
  it('từ khóa tích cực tăng điểm',()=>{const plain=scoreArticle(base,new Date('2026-07-08T09:00:00Z')).total;const boosted=scoreArticle({...base,rules:[{keyword:'hóa đơn điện tử',rule_type:'positive' as const,target_field:'all' as const,weight:5,enabled:true}]},new Date('2026-07-08T09:00:00Z')).total;expect(boosted).toBeGreaterThan(plain);});
  it('từ khóa tiêu cực giảm điểm',()=>expect(scoreArticle({...base,rules:[{keyword:'hóa đơn',rule_type:'negative' as const,target_field:'title' as const,weight:5,enabled:true}]},new Date('2026-07-08T09:00:00Z')).negative).toBeGreaterThan(0));
  it('từ khóa loại tuyệt đối ẩn bài',()=>expect(scoreArticle({...base,rules:[{keyword:'hóa đơn',rule_type:'negative' as const,target_field:'all' as const,weight:100,enabled:true}]},new Date('2026-07-08T09:00:00Z')).hidden).toBe(true));
  it('độ mới suy giảm theo thời gian',()=>expect(freshnessScore('2026-07-08T08:00:00Z',24,new Date('2026-07-09T08:00:00Z'))).toBeCloseTo(20*Math.exp(-1)));
});
