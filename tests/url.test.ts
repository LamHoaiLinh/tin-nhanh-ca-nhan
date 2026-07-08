import { describe, expect, it } from 'vitest';
import { canonicalizeUrl, sha256Hex } from '../src/algorithms/url';
describe('canonicalizeUrl',()=>{
  it('xóa tracking, fragment, www và sắp xếp query',()=>{
    expect(canonicalizeUrl('HTTPS://WWW.Example.com/a/?utm_source=x&b=2&a=1#top')).toBe('https://example.com/a?a=1&b=2');
  });
  it('giữ query có thể làm thay đổi nội dung',()=>{
    expect(canonicalizeUrl('https://example.com/news?id=9&page=2&fbclid=x')).toBe('https://example.com/news?id=9&page=2');
  });
  it('chỉ nhận http/https',()=>expect(()=>canonicalizeUrl('file:///etc/passwd')).toThrow());
  it('tạo sha256 ổn định',async()=>expect(await sha256Hex('abc')).toHaveLength(64));
});
