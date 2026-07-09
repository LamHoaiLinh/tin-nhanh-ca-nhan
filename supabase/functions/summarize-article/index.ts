import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { errorResponse, json } from '../_shared/response.ts';
import { summarizeArticleText } from '../_shared/article-summary.ts';
import { loadArticleForSummary } from '../_shared/article-source.ts';

interface ArticleRow {
  id: string;
  source_id: string;
  title: string;
  description: string;
  original_url: string;
}

interface SourceRow {
  user_id: string;
  name: string;
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

    const articleRow = article as ArticleRow;
    const { data: source, error: sourceError } = await caller.admin
      .from('sources')
      .select('user_id,name')
      .eq('id', articleRow.source_id)
      .single();
    if (sourceError || !source || (source as SourceRow).user_id !== caller.userId) {
      throw new Error('Bạn không có quyền tóm tắt bài này.');
    }

    const sourceResult = await loadArticleForSummary(
      articleRow.original_url,
      articleRow.title,
      articleRow.description,
    );
    const extracted = sourceResult.article;
    if (!extracted.text.trim()) {
      throw new Error('Không lấy được nội dung đủ để tóm tắt. Hãy dùng nút Sao chép link hoặc mở bài gốc.');
    }

    const summary = summarizeArticleText(
      articleRow.title,
      extracted.paragraphs,
      Number.isFinite(body.seed) ? Number(body.seed) : Date.now(),
    );
    if (!summary.paragraphs.length) throw new Error('Nội dung bài quá ngắn để tạo bản tóm tắt có ý nghĩa.');

    console.info(JSON.stringify({
      event: 'summarize_article',
      articleId: articleRow.id,
      extractionMethod: extracted.method,
      extractionVariant: sourceResult.variant,
      originalWordCount: summary.originalWordCount,
      summaryWordCount: summary.summaryWordCount,
      attempts: sourceResult.attempts,
    }));

    return json({
      articleId: articleRow.id,
      title: articleRow.title,
      sourceName: (source as SourceRow).name,
      originalUrl: sourceResult.resolvedUrl,
      extractionMethod: extracted.method,
      extractionVariant: sourceResult.variant,
      warning: sourceResult.warning,
      extractionAttempts: sourceResult.attempts.map((attempt) => ({
        variant: attempt.variant,
        ok: attempt.ok,
        status: attempt.status ?? null,
        method: attempt.method ?? null,
        wordCount: attempt.wordCount ?? null,
        message: attempt.message,
      })),
      ...summary,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
