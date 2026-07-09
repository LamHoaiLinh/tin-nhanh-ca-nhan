export interface DefaultSourceDefinition {
  name: string;
  feed_url: string;
  website_url: string;
  category: string;
  priority: number;
  enabled: boolean;
}

/**
 * Các nguồn đã được người dùng kiểm tra thực tế ngày 09/07/2026.
 * Tên nguồn được chuẩn hóa theo đúng tên miền để tránh nhầm lẫn khi hiển thị.
 */
export const DEFAULT_SOURCES: readonly DefaultSourceDefinition[] = [
  {
    name: 'Báo Pháp Luật TP. Hồ Chí Minh',
    feed_url: 'https://plo.vn/rss/home.rss',
    website_url: 'https://plo.vn',
    category: 'Pháp luật doanh nghiệp',
    priority: 8,
    enabled: true,
  },
  {
    name: 'Dân Trí - Trang chủ',
    feed_url: 'https://dantri.com.vn/rss/home.rss',
    website_url: 'https://dantri.com.vn',
    category: 'Tin tổng hợp',
    priority: 7,
    enabled: true,
  },
  {
    name: 'Thanh Niên - Trang chủ',
    feed_url: 'https://thanhnien.vn/rss/home.rss',
    website_url: 'https://thanhnien.vn',
    category: 'Tin tổng hợp',
    priority: 7,
    enabled: true,
  },
  {
    name: 'VnExpress - Thời sự',
    feed_url: 'https://vnexpress.net/rss/thoi-su.rss',
    website_url: 'https://vnexpress.net',
    category: 'Tin tổng hợp',
    priority: 7,
    enabled: true,
  },
  {
    name: 'Báo Giáo dục và Thời đại Online',
    feed_url: 'https://giaoducthoidai.vn/rss/home.rss',
    website_url: 'https://giaoducthoidai.vn',
    category: 'Tin tổng hợp',
    priority: 5,
    enabled: true,
  },
  {
    name: 'Báo Sài Gòn Giải Phóng',
    feed_url: 'https://www.sggp.org.vn/rss/home.rss',
    website_url: 'https://www.sggp.org.vn',
    category: 'Tin tổng hợp',
    priority: 5,
    enabled: true,
  },
  {
    name: 'VOV - Trang RSS',
    feed_url: 'https://vov.vn/rss',
    website_url: 'https://vov.vn',
    category: 'Tin tổng hợp',
    priority: 5,
    enabled: true,
  },
  {
    name: 'Sức khỏe & Đời sống - Trang RSS',
    feed_url: 'https://suckhoedoisong.vn/rss',
    website_url: 'https://suckhoedoisong.vn',
    category: 'Tin tổng hợp',
    priority: 5,
    enabled: true,
  },
  {
    name: 'Tuổi Trẻ Online - Tin mới nhất',
    feed_url: 'https://tuoitre.vn/rss/tin-moi-nhat.rss',
    website_url: 'https://tuoitre.vn',
    category: 'Tin tổng hợp',
    priority: 5,
    enabled: true,
  },
] as const;

export const DEFAULT_SOURCE_URLS = DEFAULT_SOURCES.map((source) => source.feed_url);
