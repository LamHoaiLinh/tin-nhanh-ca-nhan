export function formatRelativeTime(value: string): string {
  const diffSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return formatter.format(diffSeconds, 'second');
  if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 604800) return formatter.format(Math.round(diffSeconds / 86400), 'day');
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
}
export function formatDateTime(value?: string | null): string { return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle:'short', timeStyle:'short', timeZone:'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Chưa có'; }
