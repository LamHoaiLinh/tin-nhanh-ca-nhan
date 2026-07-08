import { describe, expect, it } from 'vitest';
import { assertPublicHttpUrl, isPrivateIpLiteral } from '../src/algorithms/ssrf';
describe('SSRF',()=>{
  it.each(['localhost','127.0.0.1','10.0.0.2','172.16.0.1','172.31.2.3','192.168.1.1','169.254.169.254','::1'])(`chặn %s`,(host)=>expect(isPrivateIpLiteral(host)).toBe(true));
  it('cho phép tên miền công khai',()=>expect(assertPublicHttpUrl('https://example.com/rss.xml').hostname).toBe('example.com'));
  it('chặn URL có tài khoản',()=>expect(()=>assertPublicHttpUrl('https://a:b@example.com/rss')).toThrow());
});
