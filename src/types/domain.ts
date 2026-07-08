export interface Profile { id: string; email: string | null; display_name: string | null; created_at: string; }
export interface Source {
  id: string; user_id: string; name: string; feed_url: string; website_url: string | null; logo_url: string | null;
  category: string; priority: number; enabled: boolean; last_scanned_at: string | null; last_success_at: string | null;
  last_status: string | null; last_error: string | null; consecutive_errors: number; created_at: string; updated_at: string;
}
export interface SourceCatalog {
  id: string; name: string; feed_url: string; website_url: string | null; logo_url: string | null; category: string;
  priority: number; verification_status: 'verified' | 'needs_runtime_check'; notes: string | null;
}
export interface ArticleFeedItem {
  id: string; source_id: string; guid: string | null; original_url: string; canonical_url: string; title: string;
  description: string; image_url: string | null; author: string | null; category: string; published_at: string; fetched_at: string;
  relevance_score: number; duplicate_count: number; matched_keywords: string[]; score_breakdown: Record<string, number>;
  source_name: string; source_logo_url: string | null; source_priority: number;
  is_read: boolean; is_saved: boolean; is_hidden: boolean;
}
export interface KeywordRule {
  id: string; user_id: string; keyword: string; rule_type: 'positive' | 'negative' | 'required'; target_field: 'title' | 'description' | 'all'; weight: number; enabled: boolean;
}
export interface CategoryPreference { id: string; user_id: string; category: string; weight: number; enabled: boolean; }
export interface UserSettings {
  user_id: string; scan_interval_minutes: number; article_retention_days: number; page_size: number; duplicate_threshold: number;
  default_sort: 'relevance' | 'newest'; show_hidden: boolean; image_fallback_mode: 'logo' | 'category';
}
export interface ArticleFilters {
  search: string; sort: 'relevance' | 'newest'; state: 'all' | 'unread' | 'saved'; category: string; sourceId: string;
  minScore: number; fromDate: string; toDate: string; page: number; pageSize: number;
}
export interface FeedValidationResult {
  valid: boolean; feedName: string; websiteUrl: string | null; itemCount: number; newestDate: string | null; hasImage: boolean; format: 'RSS 2.0' | 'Atom' | 'RDF' | 'Unknown';
}
