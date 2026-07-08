import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
export function AppShell() {
  const { user, signOut } = useAuth();
  return <div className="app-shell">
    <header className="topbar">
      <NavLink to="/" className="brand"><span className="brand-mark">TN</span><span><strong>Tin Nhanh</strong><small>Cá nhân • Không dùng AI</small></span></NavLink>
      <nav className="desktop-nav" aria-label="Điều hướng chính">
        <NavLink to="/">Tin tức</NavLink><NavLink to="/sources">Nguồn tin</NavLink><NavLink to="/rules">Sở thích</NavLink><NavLink to="/settings">Cài đặt</NavLink>
      </nav>
      <div className="account"><span title={user?.email}>{user?.email}</span><button className="button ghost" onClick={() => void signOut()}>Đăng xuất</button></div>
    </header>
    <main className="main-content"><Outlet /></main>
  </div>;
}
