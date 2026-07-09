interface Props { page: number; totalPages: number; onPrevious: () => void; onNext: () => void; onTop: () => void; loading?: boolean; }
export function BottomNav({ page, totalPages, onPrevious, onNext, onTop, loading }: Props) {
  return <nav className="bottom-nav" aria-label="Phân trang">
    <button title="Chuyển về trang bài viết trước" disabled={page <= 1 || loading} onClick={onPrevious}>← Trang trước</button>
    <strong title="Trang hiện tại trên tổng số trang">Trang {page}/{Math.max(1,totalPages)}</strong>
    <button title="Chuyển sang trang bài viết tiếp theo" disabled={page >= totalPages || loading} onClick={onNext}>Trang sau →</button>
    <button title="Cuộn lên đầu trang" aria-label="Lên đầu trang" onClick={onTop}>↑</button>
  </nav>;
}
