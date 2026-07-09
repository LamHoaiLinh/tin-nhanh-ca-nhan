import { describe, expect, it } from 'vitest';
import { buildClientInsightQuestions, ensureInsightQuestions } from '../src/algorithms/insightQuestions';
import type { ArticleSummary } from '../src/types/domain';

const paragraphs = [
  'Các doanh nghiệp đang tăng cường ứng dụng trí tuệ nhân tạo để phát hiện tấn công mạng, nhưng tội phạm cũng dùng chính công nghệ này nhằm tự động hóa lừa đảo và phát tán mã độc.',
  'Theo chuyên gia, doanh nghiệp cần hợp nhất dữ liệu từ thiết bị đầu cuối, hệ thống quản lý danh tính, môi trường đám mây và hạ tầng mạng trước khi triển khai phân tích bằng AI.',
  'Kế hoạch còn đòi hỏi khung quản trị minh bạch, phân công trách nhiệm cụ thể và các tiêu chí giám sát để tránh làm tăng độ phức tạp vận hành.',
  'Tác động dài hạn phụ thuộc vào năng lực nhân sự, ngân sách, chất lượng dữ liệu và khả năng phối hợp giữa bộ phận an ninh với ban điều hành.',
];

describe('câu hỏi gợi mở phía frontend', () => {
  it('tạo câu hỏi khi Edge Function cũ không trả insightQuestions', () => {
    const questions = buildClientInsightQuestions('Doanh nghiệp cần làm gì trước các mối đe dọa do AI tạo ra?', paragraphs, 2026);
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.every((item) => item.question.endsWith('?'))).toBe(true);
  });

  it('tự bổ sung trường còn thiếu trong payload cũ', () => {
    const oldPayload = {
      articleId: '1',
      title: 'Doanh nghiệp cần làm gì trước các mối đe dọa do AI tạo ra?',
      sourceName: 'Nguồn thử nghiệm',
      originalUrl: 'https://example.com/article',
      extractionMethod: 'readability',
      warning: null,
      paragraphs,
      originalWordCount: 160,
      summaryWordCount: 80,
      compressionRatio: 0.5,
      selectedSentenceCount: 4,
    } as unknown as ArticleSummary;
    const fixed = ensureInsightQuestions(oldPayload, 2026);
    expect(fixed.insightQuestions.length).toBeGreaterThanOrEqual(3);
  });

  it('giữ nguyên câu hỏi do Edge Function mới trả về', () => {
    const current = {
      articleId: '1', title: 'Bài thử', sourceName: 'Nguồn', originalUrl: 'https://example.com',
      extractionMethod: 'readability', warning: null, paragraphs, originalWordCount: 150,
      summaryWordCount: 70, compressionRatio: 0.46, selectedSentenceCount: 4,
      insightQuestions: [{ kind: 'evidence', label: 'Kiểm chứng dữ kiện', question: 'Nguồn dữ liệu chính của bài là gì?' }],
    } satisfies ArticleSummary;
    expect(ensureInsightQuestions(current, 1).insightQuestions).toEqual(current.insightQuestions);
  });
});
