import { describe, expect, it } from 'vitest';
import { extractArticleFromHtml, summarizeArticleText } from '../supabase/functions/_shared/article-summary';

const paragraphs = [
  'Thành phố đang xây dựng phương án điều chỉnh giao thông tại khu vực trung tâm nhằm giảm ùn tắc kéo dài trong giờ cao điểm. Kế hoạch tập trung vào việc tổ chức lại luồng xe, tăng kết nối vận tải công cộng và kiểm soát các điểm thường xuyên phát sinh xung đột.',
  'Theo số liệu của cơ quan quản lý, lượng phương tiện đi qua khu vực này đã tăng gần 18% trong ba năm, trong khi diện tích mặt đường hầu như không thay đổi. Nhiều chuyên gia cho rằng chỉ mở rộng đường sẽ không giải quyết được vấn đề nếu người dân vẫn phụ thuộc chủ yếu vào xe cá nhân.',
  'Tuy nhiên, một số doanh nghiệp vận tải lo ngại việc hạn chế phương tiện quá sớm có thể làm tăng chi phí giao hàng và ảnh hưởng hoạt động kinh doanh. Họ đề nghị thành phố công bố lộ trình rõ ràng, đồng thời tổ chức các tuyến trung chuyển phù hợp trước khi áp dụng biện pháp bắt buộc.',
  'Đề án hiện được lấy ý kiến trong ba tháng và sẽ được đánh giá theo từng khu vực thay vì triển khai đồng loạt. Nếu các chỉ số ùn tắc, thời gian di chuyển và mức sử dụng xe buýt được cải thiện, mô hình có thể mở rộng sang những quận lân cận.',
  'Điểm đáng chú ý là cơ quan soạn thảo không xem đây là một giải pháp đơn lẻ. Hiệu quả cuối cùng phụ thuộc vào khả năng phối hợp giữa hạ tầng, phương tiện công cộng, chính sách giá và thói quen đi lại của người dân.'
];

describe('trích xuất và tóm tắt bài báo', () => {
  it('ưu tiên articleBody trong JSON-LD', () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({ '@type':'NewsArticle', articleBody: paragraphs.join('\n\n') })}</script></head><body><p>Quảng cáo ngắn.</p></body></html>`;
    const extracted = extractArticleFromHtml(html, 'Mô tả dự phòng');
    expect(extracted.method).toBe('json-ld');
    expect(extracted.text).toContain('lượng phương tiện');
  });

  it('lấy các đoạn chính trong thẻ article và loại phần nhiễu', () => {
    const html = `<article>${paragraphs.map((p) => `<p>${p}</p>`).join('')}<p>Xem thêm: một bài khác</p></article>`;
    const extracted = extractArticleFromHtml(html);
    expect(extracted.method).toBe('article');
    expect(extracted.paragraphs.length).toBe(5);
    expect(extracted.text).not.toContain('Xem thêm');
  });

  it('tạo bản tóm tắt theo thứ tự logic và gần 30% độ dài', () => {
    const result = summarizeArticleText('Điều chỉnh giao thông trung tâm để giảm ùn tắc', paragraphs, 1234);
    expect(result.paragraphs.length).toBeGreaterThan(0);
    expect(result.selectedSentenceCount).toBeGreaterThanOrEqual(3);
    expect(result.compressionRatio).toBeGreaterThanOrEqual(0.24);
    expect(result.compressionRatio).toBeLessThanOrEqual(0.38);
    expect(result.paragraphs.join(' ')).toMatch(/Thành phố|Kế hoạch/);
    expect(result.paragraphs.join(' ')).toMatch(/18%|lo ngại/);
  });

  it('thay đổi câu chuyển ý theo seed nhưng giữ nội dung cốt lõi', () => {
    const first = summarizeArticleText('Điều chỉnh giao thông trung tâm để giảm ùn tắc', paragraphs, 10);
    const second = summarizeArticleText('Điều chỉnh giao thông trung tâm để giảm ùn tắc', paragraphs, 999);
    expect(first.paragraphs.join(' ')).not.toBe(second.paragraphs.join(' '));
    expect(first.selectedSentenceCount).toBe(second.selectedSentenceCount);
  });
});

import { buildHeuristicAlternativeUrls, discoverAlternativeArticleUrls, extractBestArticleFromHtml } from '../supabase/functions/_shared/article-extractor';

describe('trích xuất toàn văn nhiều tầng', () => {
  it('dùng Mozilla Readability khi trang không có articleBody', () => {
    const body = paragraphs.concat([
      'Việc triển khai còn phụ thuộc nguồn lực ngân sách, khả năng phối hợp giữa các đơn vị và chất lượng dữ liệu theo dõi sau khi chính sách có hiệu lực.',
      'Cơ quan quản lý cho biết kết quả thí điểm sẽ được công khai để người dân và doanh nghiệp cùng giám sát trong thời gian tới.',
    ]);
    const html = `<!doctype html><html><head><title>Điều chỉnh giao thông</title></head><body><nav>${'Menu '.repeat(40)}</nav><div class="page"><article><h1>Điều chỉnh giao thông trung tâm</h1>${body.map((p) => `<p>${p}</p>`).join('')}</article></div><aside>${'Tin liên quan '.repeat(80)}</aside></body></html>`;
    const extracted = extractBestArticleFromHtml(html, 'https://example.com/bai-viet', 'Điều chỉnh giao thông trung tâm', 'Mô tả RSS rất ngắn.');
    expect(extracted.article).not.toBeNull();
    expect(extracted.method).toBe('readability');
    expect(extracted.article?.text).toContain('lượng phương tiện');
    expect(extracted.article?.text).not.toContain('Tin liên quan Tin liên quan');
  });

  it('dùng selector báo Việt Nam khi Readability không đạt ngưỡng', () => {
    const html = `<html><body><div class="detail-content">${paragraphs.map((p) => `<p>${p}</p>`).join('')}</div><div class="related-news"><p>${'Tin liên quan không thuộc thân bài. '.repeat(20)}</p></div></body></html>`;
    const extracted = extractBestArticleFromHtml(html, 'https://example.com/tin', 'Điều chỉnh giao thông trung tâm', 'Mô tả RSS ngắn.');
    expect(extracted.article).not.toBeNull();
    expect(['readability', 'site-selector']).toContain(extracted.method);
    expect(extracted.article?.paragraphs.length).toBeGreaterThanOrEqual(5);
  });

  it('phát hiện link AMP/mobile và tạo phương án dự phòng hợp lệ', () => {
    const html = `<html><head><link rel="amphtml" href="/amp/bai-viet"><link rel="alternate" media="only screen and (max-width: 640px)" href="https://m.example.com/bai-viet"></head></html>`;
    const discovered = discoverAlternativeArticleUrls(html, 'https://www.example.com/bai-viet');
    expect(discovered).toContain('https://www.example.com/amp/bai-viet');
    expect(discovered).toContain('https://m.example.com/bai-viet');

    const heuristics = buildHeuristicAlternativeUrls('https://www.example.com/bai-viet');
    expect(heuristics.some((url) => url.includes('/amp/bai-viet'))).toBe(true);
    expect(heuristics.some((url) => url.includes('amp=1'))).toBe(true);
  });
});
