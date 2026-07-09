interface Props { onBack:()=>void; onPrevious?:()=>void; onNext?:()=>void; originalUrl:string; }
export function DetailBottomNav({ onBack, onPrevious, onNext, originalUrl }: Props) {
  return <nav className="bottom-nav detail-nav">
    <button title="Quay lại danh sách tin" onClick={onBack}>← Quay lại</button>
    <button title="Mở bài trước trong danh sách" disabled={!onPrevious} onClick={onPrevious}>Bài trước</button>
    <button title="Mở bài tiếp theo trong danh sách" disabled={!onNext} onClick={onNext}>Bài tiếp theo</button>
    <a title="Mở nội dung đầy đủ trên website nguồn" className="button primary" href={originalUrl} target="_blank" rel="noopener noreferrer">Mở báo gốc ↗</a>
  </nav>;
}
