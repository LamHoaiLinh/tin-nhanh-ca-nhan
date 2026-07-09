import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const confirmed = process.env.CONFIRM_CLEANUP === 'true';
if (!url || !serviceRole) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
if (!confirmed) throw new Error('Chưa đặt CONFIRM_CLEANUP=true. Script dừng để tránh xóa nhầm.');

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
const BATCH = 500;
let deletedArticles = 0;
let deletedLogs = 0;

const { data: settings, error: settingsError } = await supabase
  .from('user_settings')
  .select('user_id,article_retention_days,scan_log_retention_days,database_limit_mb');
if (settingsError) throw settingsError;

for (const setting of settings ?? []) {
  const { data: sources, error: sourceError } = await supabase.from('sources').select('id').eq('user_id', setting.user_id);
  if (sourceError) throw sourceError;
  const sourceIds = (sources ?? []).map((source) => source.id);
  if (!sourceIds.length) continue;

  const articleCutoff = new Date(Date.now() - Number(setting.article_retention_days) * 86_400_000).toISOString();
  while (true) {
    const { data: candidates, error: candidateError } = await supabase
      .from('articles')
      .select('id')
      .in('source_id', sourceIds)
      .lt('published_at', articleCutoff)
      .limit(BATCH);
    if (candidateError) throw candidateError;
    const ids = (candidates ?? []).map((article) => article.id);
    if (!ids.length) break;

    const { data: saved, error: savedError } = await supabase
      .from('article_states')
      .select('article_id')
      .in('article_id', ids)
      .eq('is_saved', true);
    if (savedError) throw savedError;

    const savedIds = new Set((saved ?? []).map((state) => state.article_id));
    const deletable = ids.filter((id) => !savedIds.has(id));
    if (deletable.length) {
      const { error: deleteError } = await supabase.from('articles').delete().in('id', deletable);
      if (deleteError) throw deleteError;
      deletedArticles += deletable.length;
    }
    if (ids.length < BATCH || !deletable.length) break;
  }

  const logRetentionDays = Number(setting.scan_log_retention_days ?? 30);
  const logCutoff = new Date(Date.now() - logRetentionDays * 86_400_000).toISOString();
  while (true) {
    const { data: logs, error: logError } = await supabase
      .from('scan_logs')
      .select('id')
      .in('source_id', sourceIds)
      .lt('started_at', logCutoff)
      .limit(BATCH);
    if (logError) throw logError;
    const logIds = (logs ?? []).map((log) => log.id);
    if (!logIds.length) break;
    const { error: deleteLogError } = await supabase.from('scan_logs').delete().in('id', logIds);
    if (deleteLogError) throw deleteLogError;
    deletedLogs += logIds.length;
    if (logIds.length < BATCH) break;
  }
}

console.log(`Đã xóa ${deletedArticles} bài quá hạn chưa lưu và ${deletedLogs} nhật ký quét quá hạn.`);

const { data: storageBytes, error: storageError } = await supabase.rpc('get_database_storage_bytes');
if (storageError) throw storageError;
const usedBytes = Number(storageBytes ?? 0);
const configuredLimits = (settings ?? []).map((setting) => Number(setting.database_limit_mb ?? 500)).filter((value) => Number.isFinite(value) && value > 0);
const limitMb = configuredLimits.length ? Math.min(...configuredLimits) : 500;
const limitBytes = limitMb * 1024 * 1024;
const percent = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;
const usedMb = usedBytes / 1024 / 1024;
console.log(`Database đang dùng ${usedMb.toFixed(1)} MB / ${limitMb} MB (${percent.toFixed(1)}%).`);

if (percent >= 80) {
  console.log(`::warning title=Dung lượng database trên 80%::Đang dùng ${percent.toFixed(1)}% giới hạn. Nên giảm thời gian giữ bài hoặc kiểm tra dữ liệu đã lưu.`);
} else if (percent >= 70) {
  console.log(`::warning title=Dung lượng database trên 70%::Đang dùng ${percent.toFixed(1)}% giới hạn. Hãy theo dõi và bảo đảm workflow cleanup chạy hằng ngày.`);
}
