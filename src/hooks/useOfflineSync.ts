'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { processSyncQueue, getQueueSize } from '@/lib/offline/queue';

interface SyncStatus {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: { success: number; failed: number } | null;
}

export function useOfflineSync() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [status, setStatus] = useState<SyncStatus>({
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    lastSyncResult: null,
  });

  // Update pending count
  useEffect(() => {
    const updatePendingCount = () => {
      setStatus((prev) => ({
        ...prev,
        pendingCount: getQueueSize(),
      }));
    };

    updatePendingCount();
    
    // Poll for changes every 5 seconds
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const sync = useCallback(async () => {
    if (!isOnline) {
      console.log('Cannot sync: offline');
      return;
    }

    setStatus((prev) => ({
      ...prev,
      isSyncing: true,
    }));

    try {
      const result = await processSyncQueue();
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        lastSyncResult: result,
        pendingCount: getQueueSize(),
      }));
    } catch (error) {
      console.error('Sync failed:', error);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
      }));
    }
  }, [isOnline]);

  // Auto-sync when coming back online. This is a deliberate side-effect that
  // synchronizes the offline queue with the server on a network-state
  // transition; the resulting `isSyncing` update is intended, not a cascade.
  useEffect(() => {
    if (wasOffline && isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional external-system sync on reconnect
      sync();
    }
  }, [wasOffline, isOnline, sync]);

  return {
    ...status,
    isOnline,
    sync,
  };
}

export default useOfflineSync;

