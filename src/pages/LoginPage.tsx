import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../utils/error';

export function LoginPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (user) return <Navigate to="/" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password }); if (error) throw error;
        setMessage(data.session ? 'Đã tạo tài khoản.' : 'Đã tạo tài khoản. Hãy kiểm tra email xác nhận nếu Supabase đang bật xác nhận email.');
      }
    } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-card"><div className="brand large"><span className="brand-mark">TN</span><span><strong>Tin Nhanh Cá Nhân</strong><small>RSS thông minh bằng thuật toán, không dùng AI</small></span></div><h1>{mode==='login'?'Đăng nhập':'Tạo tài khoản'}</h1><form onSubmit={submit}><label>Email<input type="email" required autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></label><label>Mật khẩu<input type="password" required minLength={6} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={(e)=>setPassword(e.target.value)} /></label>{message && <p className="form-message">{message}</p>}<button className="button primary full" disabled={busy}>{busy?'Đang xử lý…':mode==='login'?'Đăng nhập':'Tạo tài khoản'}</button></form><button className="link-button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Chưa có tài khoản? Tạo mới':'Đã có tài khoản? Đăng nhập'}</button></section></main>;
}
