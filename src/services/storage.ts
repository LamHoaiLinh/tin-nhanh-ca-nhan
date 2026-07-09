import { supabase } from './supabase';
import { storageLevel, type StorageLevel } from '../utils/storage';

export interface DatabaseStorageHealth {
  usedBytes: number;
  limitBytes: number;
  percent: number;
  level: StorageLevel;
  limitMb: number;
}

export async function fetchDatabaseStorageHealth(): Promise<DatabaseStorageHealth> {
  const [settingsResult, sizeResult] = await Promise.all([
    supabase.from('user_settings').select('database_limit_mb').single(),
    supabase.rpc('get_database_storage_bytes'),
  ]);

  if (settingsResult.error) throw settingsResult.error;
  if (sizeResult.error) throw sizeResult.error;

  const limitMb = Math.max(100, Number(settingsResult.data?.database_limit_mb ?? 500));
  const usedBytes = Math.max(0, Number(sizeResult.data ?? 0));
  const limitBytes = limitMb * 1024 * 1024;
  const percent = limitBytes > 0 ? Math.round((usedBytes / limitBytes) * 1000) / 10 : 0;

  return { usedBytes, limitBytes, percent, level: storageLevel(percent), limitMb };
}
