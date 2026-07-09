import type { ArticleFilters, Source } from '../types/domain';
interface Props { open:boolean; filters:ArticleFilters; sources:Source[]; categories:string[]; onChange:(patch:Partial<ArticleFilters>)=>void; onClose:()=>void; }
export function FilterSheet({ open, filters, sources, categories, onChange, onClose }: Props) {
  if (!open) return null;
  return <div className="sheet-backdrop" onMouseDown={onClose}><section className="filter-sheet" onMouseDown={(event)=>event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Bộ lọc">
    <div className="sheet-header"><h2>Bộ lọc tin</h2><button title="Đóng bảng bộ lọc" onClick={onClose}>Đóng</button></div>
    <label>Sắp xếp<select title="Phù hợp nhất dùng điểm cá nhân hóa; Mới nhất dùng thời gian đăng" value={filters.sort} onChange={(event)=>onChange({sort:event.target.value as ArticleFilters['sort'],page:1})}><option value="relevance">Phù hợp nhất</option><option value="newest">Mới nhất</option></select></label>
    <label>Trạng thái<select title="Lọc tất cả, bài chưa đọc hoặc bài đã lưu" value={filters.state} onChange={(event)=>onChange({state:event.target.value as ArticleFilters['state'],page:1})}><option value="all">Tất cả</option><option value="unread">Chưa đọc</option><option value="saved">Đã lưu</option></select></label>
    <label>Chuyên mục<select title="Chỉ hiển thị bài thuộc một chuyên mục" value={filters.category} onChange={(event)=>onChange({category:event.target.value,page:1})}><option value="">Tất cả</option>{categories.map((category)=><option key={category}>{category}</option>)}</select></label>
    <label>Nguồn<select title="Chỉ hiển thị bài từ một nguồn RSS" value={filters.sourceId} onChange={(event)=>onChange({sourceId:event.target.value,page:1})}><option value="">Tất cả</option>{sources.map((source)=><option value={source.id} key={source.id}>{source.name}</option>)}</select></label>
    <label>Điểm tối thiểu<input title="Ẩn các bài có điểm phù hợp thấp hơn mức này" type="range" min="0" max="100" step="5" value={filters.minScore} onChange={(event)=>onChange({minScore:Number(event.target.value),page:1})}/><span>{filters.minScore}</span></label>
    <div className="date-grid"><label>Từ ngày<input title="Chỉ lấy bài đăng từ ngày này" type="date" value={filters.fromDate} onChange={(event)=>onChange({fromDate:event.target.value,page:1})}/></label><label>Đến ngày<input title="Chỉ lấy bài đăng đến ngày này" type="date" value={filters.toDate} onChange={(event)=>onChange({toDate:event.target.value,page:1})}/></label></div>
    <div className="inline-actions"><button title="Đưa toàn bộ bộ lọc về mặc định" onClick={()=>onChange({sort:'relevance',state:'all',category:'',sourceId:'',minScore:0,fromDate:'',toDate:'',page:1})}>Xóa bộ lọc</button><button className="button primary" title="Áp dụng lựa chọn và đóng bảng" onClick={onClose}>Xem kết quả</button></div>
  </section></div>;
}
