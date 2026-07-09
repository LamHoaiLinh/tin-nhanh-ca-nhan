import type { ArticleSummary, InsightQuestion } from '../types/domain';

const LABELS: Record<InsightQuestion['kind'], string> = {
  evidence: 'Kiểm chứng dữ kiện',
  cause: 'Đào sâu nguyên nhân',
  perspective: 'Góc nhìn còn thiếu',
  impact: 'Tác động thực tế',
  implementation: 'Khả năng thực hiện',
  'follow-up': 'Điều cần theo dõi',
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(value: string): number {
  const clean = value.trim();
  return clean ? clean.split(/\s+/).length : 0;
}

function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
}

function firstNumberSignal(text: string): string | null {
  const match = text.match(/\b\d+(?:[.,]\d+)*(?:\s*(?:%|tỷ(?:\s+đồng)?|triệu(?:\s+đồng)?|nghìn(?:\s+đồng)?|đồng|năm|tháng|ngày|giờ|ha|km|m2|m²))?/iu);
  return match?.[0]?.trim() || null;
}

function pushUnique(
  target: InsightQuestion[],
  kind: InsightQuestion['kind'],
  question: string,
): void {
  if (target.some((item) => item.kind === kind)) return;
  target.push({ kind, label: LABELS[kind], question });
}

/**
 * Tạo câu hỏi gợi mở ngay trên frontend khi Edge Function cũ chưa trả trường
 * insightQuestions. Đây là lớp tự phục hồi; Edge Function vẫn là nguồn chính vì
 * có toàn văn đầy đủ hơn.
 */
export function buildClientInsightQuestions(
  title: string,
  paragraphs: string[],
  seed = Date.now(),
): InsightQuestion[] {
  const text = paragraphs.join(' ').replace(/\s+/g, ' ').trim();
  const totalWords = wordCount(text);
  if (totalWords < 45) return [];

  const combined = `${title} ${text}`;
  const plain = normalize(combined);
  const random = seededRandom(seed ^ 0x6a09e667);
  const questions: InsightQuestion[] = [];
  const numberSignal = firstNumberSignal(text);

  if (numberSignal) {
    pushUnique(
      questions,
      'evidence',
      pick([
        `Con số “${numberSignal}” được xác định từ nguồn nào và có thể đối chiếu bằng tài liệu nào?`,
        `Dữ kiện “${numberSignal}” phản ánh thời điểm, phạm vi và điều kiện cụ thể nào?`,
        `Khi kiểm chứng con số “${numberSignal}”, người đọc cần so sánh thêm với nguồn dữ liệu nào?`,
      ], random),
    );
  } else if (/\b(theo|cho biet|khang dinh|nhan dinh|bao cao|so lieu|thong ke|nghien cuu)\b/u.test(plain)) {
    pushUnique(questions, 'evidence', 'Những dữ kiện then chốt trong bài dựa trên nguồn nào và phần nào cần được đối chiếu thêm?');
  }

  if (/\b(vi|do|nguyen nhan|ly do|bat nguon|xuat phat|dan den|dan toi)\b/u.test(plain)) {
    pushUnique(
      questions,
      'cause',
      pick([
        'Bài viết đã phân biệt rõ nguyên nhân trực tiếp với nguyên nhân mang tính hệ thống hay chưa?',
        'Trong các nguyên nhân được nêu, yếu tố nào có bằng chứng mạnh nhất và yếu tố nào mới chỉ là nhận định?',
        'Nếu tách nguyên nhân chủ quan và khách quan, trách nhiệm của từng bên được thể hiện đến đâu?',
      ], random),
    );
  }

  if (/\b(nhung|tuy nhien|song|trai lai|trong khi|mac du|lo ngai|tranh luan|y kien)\b/u.test(plain) || totalWords >= 150) {
    pushUnique(
      questions,
      'perspective',
      pick([
        'Những bên liên quan hoặc góc nhìn trái chiều nào chưa được phản ánh đầy đủ?',
        'Bài viết đang dựa nhiều hơn vào quan điểm của bên nào, và tiếng nói nào còn thiếu để nhìn vấn đề cân bằng hơn?',
        'Có giả định hoặc giới hạn dữ liệu nào có thể làm thay đổi cách hiểu về kết luận chính?',
      ], random),
    );
  }

  if (/\b(anh huong|tac dong|he qua|thiet hai|loi ich|chi phi|rui ro|hau qua|keo theo)\b/u.test(plain) || totalWords >= 110) {
    pushUnique(
      questions,
      'impact',
      pick([
        'Tác động ngắn hạn và dài hạn đối với người dân, doanh nghiệp hoặc cơ quan liên quan khác nhau như thế nào?',
        'Ai là nhóm chịu ảnh hưởng rõ nhất, và tác động thực tế nên được đo bằng tiêu chí nào?',
        'Ngoài hệ quả trực tiếp được nêu, vấn đề còn có thể kéo theo chi phí hoặc rủi ro nào chưa được lượng hóa?',
      ], random),
    );
  }

  if (/\b(de xuat|kien nghi|ke hoach|du kien|cam ket|giai phap|lo trinh|trien khai|thuc hien|nghi quyet|quyet dinh|quy dinh|chinh sach|du an)\b/u.test(plain)) {
    pushUnique(
      questions,
      'implementation',
      pick([
        'Đề xuất hoặc kế hoạch đã có thời hạn, nguồn lực, đầu mối chịu trách nhiệm và cơ chế giám sát cụ thể chưa?',
        'Điều kiện nào phải được đáp ứng để giải pháp được triển khai đúng tiến độ thay vì chỉ dừng ở chủ trương?',
        'Nếu kế hoạch không đạt mục tiêu, bài viết có nêu phương án điều chỉnh hoặc tiêu chí đánh giá lại hay chưa?',
      ], random),
    );
  }

  pushUnique(
    questions,
    'follow-up',
    pick([
      'Mốc thời gian, chỉ số hoặc diễn biến nào cần theo dõi tiếp để biết vấn đề đã thực sự được giải quyết?',
      'Trong lần cập nhật tiếp theo, thông tin nào sẽ là bằng chứng rõ nhất cho thấy tình hình đang thay đổi?',
      'Người đọc nên kiểm tra lại điều gì để tránh chỉ dừng ở tuyên bố hoặc dữ kiện ban đầu?',
    ], random),
  );

  const maxQuestions = totalWords >= 230 ? 4 : totalWords >= 100 ? 3 : 2;
  const priority: InsightQuestion['kind'][] = ['evidence', 'cause', 'perspective', 'impact', 'implementation', 'follow-up'];
  return priority
    .map((kind) => questions.find((item) => item.kind === kind))
    .filter((item): item is InsightQuestion => Boolean(item))
    .slice(0, maxQuestions);
}

export function ensureInsightQuestions(summary: ArticleSummary, seed = Date.now()): ArticleSummary {
  const existing = Array.isArray(summary.insightQuestions) ? summary.insightQuestions.filter((item) => item?.question?.trim()) : [];
  if (existing.length > 0) return { ...summary, insightQuestions: existing };
  return {
    ...summary,
    insightQuestions: buildClientInsightQuestions(summary.title, summary.paragraphs, seed),
  };
}
