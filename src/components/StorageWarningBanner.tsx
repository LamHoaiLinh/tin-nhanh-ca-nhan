import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchDatabaseStorageHealth } from '../services/storage';
import { formatBytes } from '../utils/storage';

export function StorageWarningBanner() {
  const [dismissed, setDismissed] = useState(false);
  const query = useQuery({
    queryKey: ['database-storage-health'],
    queryFn: fetchDatabaseStorageHealth,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });

  if (dismissed || !query.data || query.data.level === 'ok') return null;
  const health = query.data;
  const critical = health.level === 'critical';

  return (
    <div className={`storage-warning-banner ${critical ? 'critical' : 'warning'}`} role="alert">
      <div>
        <strong>{critical ? 'Dung lượng database đang ở mức cao' : 'Database đã dùng trên 70% giới hạn'}</strong>
        <span>{formatBytes(health.usedBytes)} / {formatBytes(health.limitBytes)} ({health.percent}%). Hệ thống vẫn tự dọn bài cũ và nhật ký quét.</span>
      </div>
      <div className="storage-warning-actions">
        <Link className="button" to="/settings">Xem cài đặt</Link>
        <button type="button" aria-label="Đóng cảnh báo dung lượng" title="Ẩn cảnh báo trong phiên này" onClick={() => setDismissed(true)}>×</button>
      </div>
    </div>
  );
}
