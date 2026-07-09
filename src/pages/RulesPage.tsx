import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HelpTip } from '../components/HelpTip';
import { supabase } from '../services/supabase';
import type { CategoryPreference, KeywordRule } from '../types/domain';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../utils/error';

export function RulesPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<KeywordRule['rule_type']>('positive');
  const [weight, setWeight] = useState(3);
  const [message, setMessage] = useState('');

  const rules = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('keyword_rules').select('*').order('rule_type').order('keyword');
      if (error) throw error;
      return data ?? [];
    },
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('category_preferences').select('*').order('weight', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function add() {
    if (!user || !keyword.trim()) return;
    const { error } = await supabase.from('keyword_rules').insert({
      user_id: user.id,
      keyword: keyword.trim(),
      rule_type: type,
      target_field: 'all',
      weight,
      enabled: true,
    });
    if (error) setMessage(error.message);
    else {
      setKeyword('');
      setMessage('Đã thêm từ khóa. Quy tắc sẽ áp dụng cho các lần quét sau.');
      await client.invalidateQueries({ queryKey: ['rules'] });
    }
  }

  async function patchRule(id: string, patch: Partial<KeywordRule>) {
    const { error } = await supabase.from('keyword_rules').update(patch).eq('id', id);
    if (error) setMessage(error.message);
    else await client.invalidateQueries({ queryKey: ['rules'] });
  }

  async function patchCategory(id: string, patch: Partial<CategoryPreference>) {
    const { error } = await supabase.from('category_preferences').update(patch).eq('id', id);
    if (error) setMessage(error.message);
    else await client.invalidateQueries({ queryKey: ['categories'] });
  }

  return (
    <div className="stack-page">
      <section className="page-heading">
        <div>
          <h1>Sở thích và từ khóa</h1>
          <p>Điều chỉnh quy tắc chấm điểm minh bạch, không dùng mô hình AI.</p>
        </div>
        <Link className="button" to="/help" title="Xem ví dụ về từ khóa tăng điểm, giảm điểm và bắt buộc">Hướng dẫn từ khóa</Link>
      </section>
      {message && <div className="notice" role="status">{message}<button onClick={() => setMessage('')} aria-label="Đóng thông báo">×</button></div>}

      <section className="panel">
        <h2>Thêm từ khóa <HelpTip text="Từ khóa mới chỉ ảnh hưởng đến bài được quét sau khi quy tắc được tạo." /></h2>
        <div className="rule-add">
          <label>
            <span className="label-with-tip">Từ khóa <HelpTip text="Nên dùng cụm từ rõ nghĩa như “hóa đơn điện tử” thay vì từ quá chung như “mới”." /></span>
            <input placeholder="Ví dụ: hóa đơn điện tử" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <label>
            <span className="label-with-tip">Loại quy tắc <HelpTip text="Tăng điểm để ưu tiên; giảm điểm để đẩy xuống; bắt buộc để chỉ giữ bài có từ khóa." /></span>
            <select value={type} onChange={(event) => setType(event.target.value as KeywordRule['rule_type'])}>
              <option value="positive">Tăng điểm</option>
              <option value="negative">Giảm điểm</option>
              <option value="required">Bắt buộc</option>
            </select>
          </label>
          <label>
            <span className="label-with-tip">Trọng số {weight} <HelpTip text="Bắt đầu ở mức 3–6. Trọng số càng cao thì tác động đến điểm càng mạnh." /></span>
            <input type="range" min="1" max="10" value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
          </label>
          <button className="button primary" title="Lưu quy tắc từ khóa mới" onClick={() => void add()}>Thêm</button>
        </div>

        <div className="rule-list">
          {rules.data?.map((rule) => (
            <article key={rule.id}>
              <input title="Bật hoặc tắt quy tắc mà không cần xóa" type="checkbox" checked={rule.enabled} onChange={(event) => void patchRule(rule.id, { enabled: event.target.checked })} />
              <strong>{rule.keyword}</strong>
              <span>{rule.rule_type === 'positive' ? 'Tăng điểm' : rule.rule_type === 'negative' ? 'Giảm điểm' : 'Bắt buộc'}</span>
              <select title="Chọn phần nội dung được kiểm tra từ khóa" value={rule.target_field} onChange={(event) => void patchRule(rule.id, { target_field: event.target.value as KeywordRule['target_field'] })}>
                <option value="all">Tiêu đề + mô tả</option>
                <option value="title">Chỉ tiêu đề</option>
                <option value="description">Chỉ mô tả</option>
              </select>
              <input title="Mức tác động của từ khóa đến điểm bài viết" className="small-number" type="number" min="1" max="100" value={rule.weight} onChange={(event) => void patchRule(rule.id, { weight: Number(event.target.value) })} />
              <button className="danger-link" title="Xóa hẳn quy tắc này" onClick={async () => {
                const { error } = await supabase.from('keyword_rules').delete().eq('id', rule.id);
                if (error) setMessage(errorMessage(error));
                else await client.invalidateQueries({ queryKey: ['rules'] });
              }}>Xóa</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Trọng số chuyên mục <HelpTip text="Chuyên mục trọng số cao được ưu tiên trước khi cộng thêm điểm từ khóa và độ mới." /></h2>
        <div className="category-list">
          {categories.data?.map((category) => (
            <article key={category.id}>
              <label className="checkbox" title="Tắt chuyên mục để đưa điểm chuyên mục về 0">
                <input type="checkbox" checked={category.enabled} onChange={(event) => void patchCategory(category.id, { enabled: event.target.checked })} />
                {category.category}
              </label>
              <input title="0 là không ưu tiên; 10 là ưu tiên cao nhất" type="range" min="0" max="10" value={category.weight} onChange={(event) => void patchCategory(category.id, { weight: Number(event.target.value) })} />
              <strong>{category.weight}/10</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
