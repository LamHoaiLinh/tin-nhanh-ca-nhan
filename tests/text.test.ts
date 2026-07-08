import { describe, expect, it } from 'vitest';
import { normalizeComparisonTitle, normalizeForSearch, sanitizeDescription } from '../src/algorithms/text';
describe('chuẩn hóa tiếng Việt',()=>{
  it('so sánh không dấu và đ thành d',()=>expect(normalizeForSearch('Đào tạo lái xe ở TP.HCM')).toBe('dao tao lai xe o tp hcm'));
  it('bỏ tiền tố và stopword nhưng giữ số',()=>expect(normalizeComparisonTitle('CẬP NHẬT: Nghị định 70/2025 về hóa đơn điện tử')).toContain('nghi dinh 70 2025 hoa don dien tu'));
  it('loại html an toàn',()=>expect(sanitizeDescription('<script>x</script><b>Tin &amp; mới</b>')).toBe('Tin & mới'));
});
