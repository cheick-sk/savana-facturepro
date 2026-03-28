import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncManager } from '@/lib/sync';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Subscribe to network status
    const unsubscribe = syncManager.subscribe((online) => {
      setIsOnline(online);
    });

    // Check pending items count
    const checkPending = async () => {
      const queue = await storage.getOfflineQueue();
      setPendingCount(queue.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    try {
      await syncManager.forceSync();
      const queue = await storage.getOfflineQueue();
      setPendingCount(queue.length);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    isSyncing,
    pendingCount,
    syncNow,
  };
}

import { storage } from '@/lib/storage';
