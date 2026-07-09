import { describe, expect, it } from 'vitest';
import { ARTICLE_SORT_OPTIONS } from '../src/config/articleSort';
import { SUGGESTED_KEYWORD_GROUPS, SUGGESTED_KEYWORD_WEIGHT } from '../src/config/suggestedKeywords';

describe('tùy chọn sắp xếp', () => {
  it('giữ mới nhất làm mặc định và có đủ ba cách sắp xếp', () => {
    expect(ARTICLE_SORT_OPTIONS[0]?.value).toBe('newest');
    expect(ARTICLE_SORT_OPTIONS.map((option) => option.value)).toEqual(['newest', 'relevance', 'oldest']);
  });
});

describe('từ khóa gợi ý', () => {
  it('dùng mức ảnh hưởng trung bình', () => {
    expect(SUGGESTED_KEYWORD_WEIGHT).toBe(3);
  });

  it('không có nhóm hoặc từ khóa rỗng và không trùng từ khóa trong cùng nhóm', () => {
    expect(SUGGESTED_KEYWORD_GROUPS.length).toBeGreaterThanOrEqual(8);
    for (const group of SUGGESTED_KEYWORD_GROUPS) {
      expect(group.title.trim()).not.toBe('');
      expect(group.keywords.length).toBeGreaterThan(0);
      const normalized = group.keywords.map((keyword) => keyword.trim().toLocaleLowerCase('vi-VN'));
      expect(new Set(normalized).size).toBe(normalized.length);
    }
  });
});
