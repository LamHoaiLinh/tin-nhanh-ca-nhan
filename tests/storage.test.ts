import { describe, expect, it } from 'vitest';
import { formatBytes, storageLevel } from '../src/utils/storage';

describe('storage helpers', () => {
  it('phân mức cảnh báo đúng ngưỡng', () => {
    expect(storageLevel(69.9)).toBe('ok');
    expect(storageLevel(70)).toBe('warning');
    expect(storageLevel(79.9)).toBe('warning');
    expect(storageLevel(80)).toBe('critical');
  });

  it('định dạng dung lượng dễ đọc', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(500 * 1024 * 1024)).toBe('500 MB');
  });
});
