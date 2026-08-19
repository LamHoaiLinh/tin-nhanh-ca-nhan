import { createClient } from '@supabase/supabase-js';

const migratedProjectUrl = 'https://qjpcxhackvoewcxlatis.supabase.co';
const migratedPublishableKey = 'sb_publishable_TArSkv7lbokFpK9KZxp5Iw_iJ7f29wh';
const legacyProjectRef = 'ylborhegyyyrtpshizyo';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const usableConfiguredProject = Boolean(
  configuredUrl &&
  configuredKey &&
  !configuredUrl.includes(legacyProjectRef),
);

export const supabaseUrl: string = usableConfiguredProject ? configuredUrl! : migratedProjectUrl;
export const supabasePublishableKey: string = usableConfiguredProject ? configuredKey! : migratedPublishableKey;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
