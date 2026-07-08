import { corsHeaders } from './cors.ts';
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } });
}
export function errorResponse(error: unknown, status = 400): Response {
  const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
  console.error(error);
  return json({ error: message }, status);
}
