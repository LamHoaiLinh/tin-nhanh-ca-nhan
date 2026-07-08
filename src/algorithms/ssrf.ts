export function isPrivateIpLiteral(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  if (/^169\.254\./.test(host) || host === '0.0.0.0') return true;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
  return false;
}
export function assertPublicHttpUrl(input: string): URL {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Chỉ chấp nhận HTTP hoặc HTTPS.');
  if (url.username || url.password) throw new Error('URL không được chứa tài khoản hoặc mật khẩu.');
  if (isPrivateIpLiteral(url.hostname)) throw new Error('URL nội bộ hoặc private IP bị chặn.');
  return url;
}
