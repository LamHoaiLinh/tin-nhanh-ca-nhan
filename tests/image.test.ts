import { describe, expect, it } from 'vitest';
import { chooseArticleImage } from '../src/algorithms/image';
describe('chọn ảnh RSS',()=>{
  it('ưu tiên media content',()=>expect(chooseArticleImage({mediaContent:{'@_url':'https://a.vn/1.jpg'},description:'<img src="https://a.vn/2.jpg">'})).toBe('https://a.vn/1.jpg'));
  it('lấy ảnh từ mô tả',()=>expect(chooseArticleImage({description:'<p>x</p><img src="https://a.vn/2.jpg">'})).toBe('https://a.vn/2.jpg'));
  it('fallback logo khi không có ảnh',()=>expect(chooseArticleImage({sourceLogo:'https://a.vn/logo.png'})).toBe('https://a.vn/logo.png'));
});
