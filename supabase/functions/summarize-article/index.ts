import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { assertSafeUrl } from '../_shared/security.ts';
import { errorResponse, json } from '../_shared/response.ts';
import { extractArticleFromHtml, summarizeArticleText } from '../_shared/article-summary.ts';

interface ArticleRow {
  id: string;
  source_id: string;
  title: string;
  description: string;
  original_url: string;
}

interface SourceRow { user_id: string; name: string; }

async function fetchArticleHtml(input: string, redirects = 0): Promise<{ body: string; finalUrl: string }> {
  if (redirects > 4) throw new Error('Bài báo chuyển hướng quá nhiều lần.');
  const url = await assertSafeUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TinNhanhCaNhan/1.2; +algorithmic-summary)',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.5',
      },
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error('Bài báo phản hồi quá 10 giây.');
    throw new Error(`Không thể tải bài báo: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location');
    if (!location) throw new Error('Bài báo chuyển hướng nhưng thiếu địa chỉ đích.');
    return fetchArticleHtml(new URL(location, url).toString(), redirects + 1);
  }
  if (!response.ok) throw new Error(`Website nguồn trả về HTTP ${response.status}.`);
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.includes('html') && !contentType.includes('text/plain')) throw new Error('Nguồn không trả về trang bài báo dạng HTML.');

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Bài báo không có nội dung.');
  const chunks: Uint8Array[] = [];
  let total = 0;
  const maxBytes = 5 * 1024 * 1024;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Trang bài báo vượt quá giới hạn 5 MB.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body: string;
  try { body = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { body = new TextDecoder().decode(bytes); }
  return { body, finalUrl: response.url || url.toString() };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Chỉ hỗ trợ POST.' }, 405);
  try {
    const caller = await authenticate(req);
    if (caller.mode !== 'user' || !caller.userId) throw new Error('Yêu cầu đăng nhập.');
    const body = await req.json().catch(() => ({})) as { articleId?: string; seed?: number };
    if (!body.articleId) throw new Error('Thiếu mã bài báo.');

    const { data: article, error: articleError } = await caller.admin
      .from('articles')
      .select('id,source_id,title,description,original_url')
      .eq('id', body.articleId)
      .single();
    if (articleError || !article) throw new Error('Không tìm thấy bài báo.');

    const { data: source, error: sourceError } = await caller.admin
      .from('sources')
      .select('user_id,name')
      .eq('id', (article as ArticleRow).source_id)
      .single();
    if (sourceError || !source || (source as SourceRow).user_id !== caller.userId) throw new Error('Bạn không có quyền tóm tắt bài này.');

    let extracted: ReturnType<typeof extractArticleFromHtml>;
    let warning: string | null = null;
    let resolvedUrl = (article as ArticleRow).original_url;
    try {
      const page = await fetchArticleHtml((article as ArticleRow).original_url);
      resolvedUrl = page.finalUrl;
      extracted = extractArticleFromHtml(page.body, (article as ArticleRow).description);
      if (extracted.method === 'rss-description') warning = 'Website nguồn không cho lấy toàn văn; bản tóm tắt đang dựa trên mô tả RSS.';
    } catch (error) {
      extracted = extractArticleFromHtml('', (article as ArticleRow).description);
      warning = `${error instanceof Error ? error.message : 'Không lấy được toàn văn.'} Bản tóm tắt đang dựa trên mô tả RSS.`;
    }

    if (!extracted.text.trim()) throw new Error('Không lấy được nội dung đủ để tóm tắt. Hãy dùng nút Sao chép link hoặc mở bài gốc.');
    const summary = summarizeArticleText((article as ArticleRow).title, extracted.paragraphs, Number.isFinite(body.seed) ? Number(body.seed) : Date.now());
    if (!summary.paragraphs.length) throw new Error('Nội dung bài quá ngắn để tạo bản tóm tắt có ý nghĩa.');

    return json({
      articleId: (article as ArticleRow).id,
      title: (article as ArticleRow).title,
      sourceName: (source as SourceRow).name,
      originalUrl: resolvedUrl,
      extractionMethod: extracted.method,
      warning,
      ...summary,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
