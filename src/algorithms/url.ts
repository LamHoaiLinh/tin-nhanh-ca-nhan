const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'fbclid','gclid','ref','source','campaign',
]);

function decodeSafePath(pathname: string): string {
  return pathname.split('/').map((part) => {
    try { return encodeURI(decodeURIComponent(part)); } catch { return part; }
  }).join('/');
}

export function canonicalizeUrl(input: string): string {
  const url = new URL(input.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL chỉ được dùng HTTP hoặc HTTPS.');
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = decodeSafePath(url.pathname).replace(/\/$/, '') || '/';
  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.has(key.toLowerCase()))
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  url.search = '';
  for (const [key, value] of kept) url.searchParams.append(key, value);
  return url.toString().replace(/\/$/, '');
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export { TRACKING_PARAMS };
