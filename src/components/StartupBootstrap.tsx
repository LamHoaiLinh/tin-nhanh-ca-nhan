import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { ensureDefaultSources } from '../services/bootstrap';
import { scanSource } from '../services/functions';
import { errorMessage } from '../utils/error';

const BOOTSTRAP_VERSION = '2026-07-09-v1';
const AUTO_SCAN_INTERVAL_MS = 15 * 60 * 1000;

export function StartupBootstrap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'busy' | 'success' | 'error'>('busy');

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function bootstrap() {
      const seedKey = `tin-nhanh:default-sources:${BOOTSTRAP_VERSION}:${userId}`;
      const scanKey = `tin-nhanh:last-auto-scan:${userId}`;
      const needsSeed = localStorage.getItem(seedKey) !== 'done';
      const lastScan = Number(localStorage.getItem(scanKey) ?? '0');
      const needsScan = !Number.isFinite(lastScan) || Date.now() - lastScan >= AUTO_SCAN_INTERVAL_MS;

      if (!needsSeed && !needsScan) return;

      setKind('busy');
      setMessage(needsSeed ? 'Đang chuẩn bị các nguồn báo mặc định và quét tin lần đầu…' : 'Đang cập nhật tin mới từ các nguồn đang bật…');

      try {
        let inserted = 0;
        if (needsSeed) {
          const seeded = await ensureDefaultSources(userId);
          inserted = seeded.inserted;
          localStorage.setItem(seedKey, 'done');
        }

        let scanSummary = '';
        if (needsScan || needsSeed) {
          const result = await scanSource();
          localStorage.setItem(scanKey, String(Date.now()));
          scanSummary = `Đã quét ${result.scanned} nguồn, thêm ${result.inserted} bài mới${result.errors ? `, ${result.errors} nguồn cần kiểm tra` : ''}.`;
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['sources'] }),
          queryClient.invalidateQueries({ queryKey: ['articles'] }),
          queryClient.invalidateQueries({ queryKey: ['catalog'] }),
        ]);

        if (!cancelled) {
          setKind('success');
          setMessage(`${inserted ? `Đã thêm ${inserted} nguồn mặc định. ` : ''}${scanSummary}`.trim());
          window.setTimeout(() => {
            if (!cancelled) setMessage('');
          }, 9000);
        }
      } catch (error) {
        if (!cancelled) {
          setKind('error');
          setMessage(`Không thể hoàn tất quét tin ban đầu: ${errorMessage(error)}`);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
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
