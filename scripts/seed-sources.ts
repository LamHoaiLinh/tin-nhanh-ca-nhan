import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.TARGET_USER_ID;
if (!url || !serviceRole || !userId) throw new Error('Cần SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY và TARGET_USER_ID.');
const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
const { data: catalog, error } = await supabase.from('source_catalog').select('*').eq('verification_status', 'verified');
if (error) throw error;
if (!catalog?.length) {
  console.log('Không có nguồn nào được đánh dấu verified. Hãy kiểm tra RSS trên giao diện trước.');
  process.exit(0);
}
const rows = catalog.map((item) => ({ user_id: userId, name: item.name, feed_url: item.feed_url, website_url: item.website_url, logo_url: item.logo_url, category: item.category, priority: item.priority, enabled: false }));
const { error: insertError } = await supabase.from('sources').upsert(rows, { onConflict: 'user_id,feed_url', ignoreDuplicates: true });
if (insertError) throw insertError;
console.log(`Đã thêm ${rows.length} nguồn ở trạng thái tắt. Người dùng phải kiểm tra rồi mới bật.`);
