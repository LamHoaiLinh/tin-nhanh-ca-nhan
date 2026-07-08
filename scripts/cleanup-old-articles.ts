import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const confirmed = process.env.CONFIRM_CLEANUP === 'true';
if (!url || !serviceRole) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
if (!confirmed) throw new Error('Chưa đặt CONFIRM_CLEANUP=true. Script dừng để tránh xóa nhầm.');
const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
const BATCH = 500;
let deleted = 0;

const { data: settings, error: settingsError } = await supabase.from('user_settings').select('user_id,article_retention_days');
if (settingsError) throw settingsError;
for (const setting of settings ?? []) {
  const cutoff = new Date(Date.now() - Number(setting.article_retention_days) * 86_400_000).toISOString();
  const { data: sources, error: sourceError } = await supabase.from('sources').select('id').eq('user_id', setting.user_id);
  if (sourceError) throw sourceError;
  const sourceIds = (sources ?? []).map((source) => source.id);
  if (!sourceIds.length) continue;
  while (true) {
    const { data: candidates, error: candidateError } = await supabase
      .from('articles')
      .select('id')
      .in('source_id', sourceIds)
      .lt('published_at', cutoff)
      .limit(BATCH);
    if (candidateError) throw candidateError;
    const ids = (candidates ?? []).map((article) => article.id);
    if (!ids.length) break;
    const { data: saved, error: savedError } = await supabase.from('article_states').select('article_id').in('article_id', ids).eq('is_saved', true);
    if (savedError) throw savedError;
    const savedIds = new Set((saved ?? []).map((state) => state.article_id));
    const deletable = ids.filter((id) => !savedIds.has(id));
    if (deletable.length) {
      const { error: deleteError } = await supabase.from('articles').delete().in('id', deletable);
      if (deleteError) throw deleteError;
      deleted += deletable.length;
    }
    if (ids.length < BATCH) break;
    if (!deletable.length) break;
  }
}
console.log(`Đã xóa ${deleted} bài quá hạn và không được lưu.`);
