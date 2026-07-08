interface Props { page: number; totalPages: number; onPrevious: () => void; onNext: () => void; onTop: () => void; loading?: boolean; }
export function BottomNav({ page, totalPages, onPrevious, onNext, onTop, loading }: Props) {
  return <nav className="bottom-nav" aria-label="Phân trang">
    <button disabled={page <= 1 || loading} onClick={onPrevious}>← Trang trước</button>
    <strong>Trang {page}/{Math.max(1,totalPages)}</strong>
    <button disabled={page >= totalPages || loading} onClick={onNext}>Trang sau →</button>
    <button aria-label="Lên đầu trang" onClick={onTop}>↑</button>
  </nav>;
}
