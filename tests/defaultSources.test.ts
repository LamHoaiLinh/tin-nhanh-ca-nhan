import { describe, expect, it } from 'vitest';
import { DEFAULT_SOURCES } from '../src/config/defaultSources';

describe('default RSS sources', () => {
  it('contains the nine verified sources', () => {
    expect(DEFAULT_SOURCES).toHaveLength(9);
  });

  it('uses unique HTTPS feed URLs', () => {
    const urls = DEFAULT_SOURCES.map((source) => source.feed_url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => url.startsWith('https://'))).toBe(true);
  });

  it('enables every source with a valid priority', () => {
    expect(DEFAULT_SOURCES.every((source) => source.enabled)).toBe(true);
    expect(DEFAULT_SOURCES.every((source) => source.priority >= 1 && source.priority <= 10)).toBe(true);
  });

  it('keeps source names consistent with their domains', () => {
    const vnexpress = DEFAULT_SOURCES.find((source) => source.feed_url.includes('vnexpress.net'));
    const vov = DEFAULT_SOURCES.find((source) => source.feed_url.includes('vov.vn'));
    expect(vnexpress?.name).toContain('VnExpress');
    expect(vov?.name).toContain('VOV');
  });
});
