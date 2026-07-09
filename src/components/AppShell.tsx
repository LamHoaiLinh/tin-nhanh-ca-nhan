import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { StartupBootstrap } from './StartupBootstrap';
import { StorageWarningBanner } from './StorageWarningBanner';

export function AppShell() {
  const { user, signOut } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" title="Mở trang tin dành cho bạn">
          <span className="brand-mark">TN</span>
          <span><strong>Tin Nhanh</strong><small>Cá nhân • Không dùng AI</small></span>
        </NavLink>
        <nav className="desktop-nav" aria-label="Điều hướng chính">
          <NavLink to="/" title="Xem và lọc các bài viết mới">Tin tức</NavLink>
          <NavLink to="/sources" title="Thêm, kiểm tra và quản lý nguồn RSS">Nguồn tin</NavLink>
          <NavLink to="/rules" title="Đặt từ khóa và trọng số chuyên mục">Sở thích</NavLink>
          <NavLink to="/settings" title="Thay đổi phân trang và thời gian lưu">Cài đặt</NavLink>
          <NavLink to="/help" title="Mở hướng dẫn sử dụng bằng tiếng Việt">Trợ giúp</NavLink>
        </nav>
        <div className="account">
          <span title={user?.email}>{user?.email}</span>
          <button className="button ghost" title="Đăng xuất khỏi tài khoản hiện tại" onClick={() => void signOut()}>Đăng xuất</button>
        </div>
      </header>
      <StartupBootstrap />
      <StorageWarningBanner />
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
