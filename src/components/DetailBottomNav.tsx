interface Props { onBack:()=>void; onPrevious?:()=>void; onNext?:()=>void; originalUrl:string; }
export function DetailBottomNav({ onBack, onPrevious, onNext, originalUrl }: Props) {
  return <nav className="bottom-nav detail-nav"><button onClick={onBack}>← Quay lại</button><button disabled={!onPrevious} onClick={onPrevious}>Bài trước</button><button disabled={!onNext} onClick={onNext}>Bài tiếp theo</button><a className="button primary" href={originalUrl} target="_blank" rel="noopener noreferrer">Mở báo gốc ↗</a></nav>;
}
