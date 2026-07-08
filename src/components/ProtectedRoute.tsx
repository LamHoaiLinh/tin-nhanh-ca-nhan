import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen"><div className="spinner" />Đang kiểm tra phiên đăng nhập…</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
