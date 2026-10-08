import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { ensureDefaultSources } from '../services/bootstrap';
import { errorMessage } from '../utils/error';

const BOOTSTRAP_VERSION = '2026-07-09-v1';

// RSS updates are scheduled server-side every three hours. Do not launch an
// expensive full scan on every sign-in or browser refresh.
export function StartupBootstrap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'busy' | 'success' | 'error'>('busy');

  useEffect(() => {
    if (!user) return;
    const seedKey = `tin-nhanh:default-sources:${BOOTSTRAP_VERSION}:${user.id}`;
    if (localStorage.getItem(seedKey) === 'done') return;
    let cancelled = false;
    setKind('busy');
    setMessage('Đang kiểm tra nguồn báo mặc định…');

    async function seedSources() {
      try {
        const seeded = await ensureDefaultSources(user!.id);
        localStorage.setItem(seedKey, 'done');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['sources'] }),
          queryClient.invalidateQueries({ queryKey: ['articles'] }),
          queryClient.invalidateQueries({ queryKey: ['catalog'] }),
        ]);
        if (!cancelled) {
          setKind('success');
          setMessage(`Đã sẵn sàng ${seeded.total} nguồn mặc định. Tin mới được cập nhật tự động; bấm “Quét ngay” để làm mới thủ công.`);
          window.setTimeout(() => { if (!cancelled) setMessage(''); }, 6000);
        }
      } catch (error) {
        if (!cancelled) {
          setKind('error');
          setMessage(`Không thể đồng bộ nguồn mặc định: ${errorMessage(error)}`);
        }
      }
    }

    void seedSources();
    return () => { cancelled = true; };
  }, [queryClient, user]);

  if (!message) return null;
  return (
    <div className={`startup-banner ${kind}`} role="status" aria-live="polite">
      {kind === 'busy' && <span className="mini-spinner" aria-hidden="true" />}
      <span>{message}</span>
      {kind !== 'busy' && <button type="button" onClick={() => setMessage('')} aria-label="Đóng thông báo">×</button>}
    </div>
  );
}
