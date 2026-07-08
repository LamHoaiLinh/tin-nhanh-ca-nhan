import { Component, type ErrorInfo, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{children:ReactNode},{hasError:boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); }
  render() { return this.state.hasError ? <main className="error-page"><h1>Ứng dụng gặp lỗi</h1><p>Hãy tải lại trang. Nếu lỗi tiếp diễn, kiểm tra cấu hình Supabase và nhật ký trình duyệt.</p><button onClick={() => location.reload()}>Tải lại</button></main> : this.props.children; }
}
