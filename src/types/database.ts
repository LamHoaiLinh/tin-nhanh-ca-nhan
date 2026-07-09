export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export interface Database {
  public: {
    Tables: {
      sources: { Row: import('./domain').Source; Insert: Partial<import('./domain').Source> & Pick<import('./domain').Source, 'user_id'|'name'|'feed_url'|'category'>; Update: Partial<import('./domain').Source>; Relationships: [] };
      source_catalog: { Row: import('./domain').SourceCatalog; Insert: Partial<import('./domain').SourceCatalog>; Update: Partial<import('./domain').SourceCatalog>; Relationships: [] };
      keyword_rules: { Row: import('./domain').KeywordRule; Insert: Omit<import('./domain').KeywordRule,'id'>; Update: Partial<import('./domain').KeywordRule>; Relationships: [] };
      category_preferences: { Row: import('./domain').CategoryPreference; Insert: Omit<import('./domain').CategoryPreference,'id'>; Update: Partial<import('./domain').CategoryPreference>; Relationships: [] };
      user_settings: { Row: import('./domain').UserSettings; Insert: import('./domain').UserSettings; Update: Partial<import('./domain').UserSettings>; Relationships: [] };
      article_states: { Row: { id:string; user_id:string; article_id:string; is_read:boolean; is_saved:boolean; is_hidden:boolean; opened_at:string|null; created_at:string; updated_at:string }; Insert: { user_id:string; article_id:string; is_read?:boolean; is_saved?:boolean; is_hidden?:boolean; opened_at?:string|null }; Update: Partial<{is_read:boolean;is_saved:boolean;is_hidden:boolean;opened_at:string|null}>; Relationships: [] };
      articles: { Row: import('./domain').ArticleFeedItem; Insert: never; Update: never; Relationships: [] };
      profiles: { Row: import('./domain').Profile; Insert: Partial<import('./domain').Profile>; Update: Partial<import('./domain').Profile>; Relationships: [] };
    };
    Views: {
      article_feed: { Row: import('./domain').ArticleFeedItem; Relationships: [] };
    };
    Functions: { get_database_storage_bytes: { Args: Record<PropertyKey, never>; Returns: number } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
