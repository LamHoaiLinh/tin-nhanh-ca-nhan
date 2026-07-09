import type { ArticleSort } from '../types/domain';

export const ARTICLE_SORT_OPTIONS: ReadonlyArray<{
  value: ArticleSort;
  label: string;
  description: string;
}> = [
  {
    value: 'newest',
    label: 'Mới nhất trước',
    description: 'Ưu tiên thời gian đăng, bài mới nhất nằm trên cùng.',
  },
  {
    value: 'relevance',
    label: 'Phù hợp nhất',
    description: 'Ưu tiên điểm sở thích, sau đó mới xét thời gian đăng.',
  },
  {
    value: 'oldest',
    label: 'Cũ nhất trước',
    description: 'Hiển thị bài cũ trước để đọc lần lượt theo dòng thời gian.',
  },
];
