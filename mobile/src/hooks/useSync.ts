import { useState, useEffect, useCallback } from 'react';
import { syncManager } from '@/lib/sync';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

export function useSync(app?: 'facturepro' | 'savanaflow' | 'schoolflow') {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    if (!syncManager.getNetworkStatus()) {
      setStatus('error');
      setError('No internet connection');
      return;
    }

    setStatus('syncing');
    setError(null);

    try {
      await syncManager.forceSync({
        app,
        onStatusChange: (s) => setStatus(s),
        onError: (e) => setError(e.message),
      });
      setLastSyncAt(new Date());
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  }, [app]);

  const isOnline = syncManager.getNetworkStatus();

  return {
    status,
    isSyncing: status === 'syncing',
    isOnline,
    lastSyncAt,
    error,
    sync,
    clearError: () => setError(null),
  };
}
