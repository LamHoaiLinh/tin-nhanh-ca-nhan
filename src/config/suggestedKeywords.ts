export interface SuggestedKeywordGroup {
  id: string;
  title: string;
  description: string;
  keywords: readonly string[];
}

export const SUGGESTED_KEYWORD_WEIGHT = 3;

export const SUGGESTED_KEYWORD_GROUPS: readonly SuggestedKeywordGroup[] = [
  {
    id: 'accounting-tax-finance',
    title: 'Kế toán, thuế và tài chính',
    description: 'Chính sách thuế, hóa đơn, báo cáo và quản trị tài chính.',
    keywords: ['thuế GTGT', 'thuế TNDN', 'thuế TNCN', 'hóa đơn điện tử', 'quyết toán thuế', 'báo cáo tài chính', 'kiểm toán', 'chi phí hợp lý', 'dòng tiền', 'phân tích tài chính'],
  },
  {
    id: 'law-policy',
    title: 'Pháp luật và chính sách',
    description: 'Văn bản mới, thủ tục, xử phạt và quy định doanh nghiệp.',
    keywords: ['nghị định', 'thông tư', 'luật doanh nghiệp', 'chính sách mới', 'xử phạt hành chính', 'hợp đồng', 'thủ tục hành chính', 'bảo vệ dữ liệu cá nhân'],
  },
  {
    id: 'business-management',
    title: 'Doanh nghiệp và quản trị',
    description: 'Vận hành, nhân sự, quy trình và chuyển đổi số.',
    keywords: ['quản trị doanh nghiệp', 'vận hành doanh nghiệp', 'quy trình', 'quản trị nhân sự', 'tiền lương', 'bảo hiểm xã hội', 'tuyển dụng', 'năng suất lao động', 'chuyển đổi số'],
  },
  {
    id: 'transport-driving',
    title: 'Giao thông, ô tô và lái xe',
    description: 'Đào tạo, sát hạch, giấy phép, đăng kiểm và phương tiện.',
    keywords: ['giấy phép lái xe', 'đào tạo lái xe', 'sát hạch lái xe', 'luật giao thông', 'đăng kiểm', 'phạt nguội', 'ô tô', 'xe điện', 'tai nạn giao thông'],
  },
  {
    id: 'technology-ai',
    title: 'Công nghệ, AI và tự động hóa',
    description: 'Công cụ số, lập trình, dữ liệu và an toàn thông tin.',
    keywords: ['trí tuệ nhân tạo', 'AI tạo sinh', 'tự động hóa', 'ChatGPT', 'dữ liệu', 'an ninh mạng', 'Python', 'VBA', 'Excel', 'phần mềm doanh nghiệp'],
  },
  {
    id: 'economy-market',
    title: 'Kinh tế và thị trường',
    description: 'Vĩ mô, ngân hàng, đầu tư và các thị trường tài sản.',
    keywords: ['kinh tế vĩ mô', 'lạm phát', 'tỷ giá', 'lãi suất', 'chứng khoán', 'ngân hàng', 'bất động sản', 'đầu tư công', 'xuất nhập khẩu'],
  },
  {
    id: 'education-skills',
    title: 'Giáo dục và kỹ năng',
    description: 'Học tập, ngoại ngữ, đào tạo nghề và kỹ năng số.',
    keywords: ['giáo dục', 'đào tạo nghề', 'ngoại ngữ', 'tiếng Anh', 'tiếng Trung', 'kỹ năng số', 'học trực tuyến', 'phương pháp học'],
  },
  {
    id: 'health-life',
    title: 'Sức khỏe và đời sống',
    description: 'Y tế, dinh dưỡng, vận động và sức khỏe gia đình.',
    keywords: ['y tế', 'dinh dưỡng', 'tập luyện', 'giảm cân', 'giấc ngủ', 'bệnh dạ dày', 'sức khỏe tinh thần', 'an toàn thực phẩm'],
  },
  {
    id: 'family-children',
    title: 'Gia đình và trẻ em',
    description: 'Nuôi dạy con, sức khỏe trẻ em và kỹ năng sống.',
    keywords: ['giáo dục trẻ em', 'sức khỏe trẻ em', 'kỹ năng sống', 'tâm lý trẻ em', 'an toàn cho trẻ', 'hoạt động gia đình'],
  },
  {
    id: 'sports-martial-arts',
    title: 'Thể thao và võ thuật',
    description: 'Thi đấu, luyện tập và các môn thể thao quan tâm.',
    keywords: ['bóng đá', 'World Cup', 'Vovinam', 'võ thuật', 'chạy bộ', 'thể hình', 'thể thao phong trào'],
  },
  {
    id: 'international-society',
    title: 'Quốc tế và xã hội',
    description: 'Quan hệ quốc tế, việc làm, dân số và môi trường.',
    keywords: ['chính trị quốc tế', 'thương mại quốc tế', 'biến đổi khí hậu', 'an sinh xã hội', 'dân số', 'việc làm', 'đô thị'],
  },
  {
    id: 'culture-entertainment',
    title: 'Văn hóa, du lịch và giải trí',
    description: 'Nội dung thư giãn, sáng tạo và trải nghiệm.',
    keywords: ['điện ảnh', 'âm nhạc', 'sách', 'văn học', 'du lịch', 'ẩm thực', 'game'],
  },
];
