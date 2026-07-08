import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.109.0';
export interface Caller { mode: 'cron' | 'user'; userId?: string; admin: SupabaseClient; }
export async function authenticate(req: Request): Promise<Caller> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRole) throw new Error('Thiếu cấu hình Supabase server.');
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) return { mode: 'cron', admin };
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Yêu cầu đăng nhập.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  return { mode: 'user', userId: data.user.id, admin };
}
