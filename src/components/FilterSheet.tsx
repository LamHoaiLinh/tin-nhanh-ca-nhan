import type { ArticleFilters, Source } from '../types/domain';
interface Props { open:boolean; filters:ArticleFilters; sources:Source[]; categories:string[]; onChange:(patch:Partial<ArticleFilters>)=>void; onClose:()=>void; }
export function FilterSheet({ open, filters, sources, categories, onChange, onClose }: Props) {
  if (!open) return null;
  return <div className="sheet-backdrop" onMouseDown={onClose}><section className="filter-sheet" onMouseDown={(e)=>e.stopPropagation()} aria-modal="true" role="dialog" aria-label="Bộ lọc"><div className="sheet-header"><h2>Bộ lọc tin</h2><button onClick={onClose}>Đóng</button></div>
    <label>Sắp xếp<select value={filters.sort} onChange={(e)=>onChange({sort:e.target.value as ArticleFilters['sort'],page:1})}><option value="relevance">Phù hợp nhất</option><option value="newest">Mới nhất</option></select></label>
    <label>Trạng thái<select value={filters.state} onChange={(e)=>onChange({state:e.target.value as ArticleFilters['state'],page:1})}><option value="all">Tất cả</option><option value="unread">Chưa đọc</option><option value="saved">Đã lưu</option></select></label>
    <label>Chuyên mục<select value={filters.category} onChange={(e)=>onChange({category:e.target.value,page:1})}><option value="">Tất cả</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Nguồn<select value={filters.sourceId} onChange={(e)=>onChange({sourceId:e.target.value,page:1})}><option value="">Tất cả</option>{sources.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
    <label>Điểm tối thiểu<input type="range" min="0" max="100" step="5" value={filters.minScore} onChange={(e)=>onChange({minScore:Number(e.target.value),page:1})}/><span>{filters.minScore}</span></label>
    <div className="date-grid"><label>Từ ngày<input type="date" value={filters.fromDate} onChange={(e)=>onChange({fromDate:e.target.value,page:1})}/></label><label>Đến ngày<input type="date" value={filters.toDate} onChange={(e)=>onChange({toDate:e.target.value,page:1})}/></label></div>
    <button className="button primary full" onClick={onClose}>Áp dụng</button>
  </section></div>;
}
