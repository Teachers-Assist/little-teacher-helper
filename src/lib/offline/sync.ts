import { getOfflineData, saveOfflineData, markSubmissionSynced, getUnsyncedSubmissions } from './storage';
import { processSyncQueue, syncAll, getQueueSize } from './queue';
import { SubmissionStatus } from '@/types';

/**
 * 同步狀態
 */
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  lastError: string | null;
}

/**
 * 同步服務 - 管理離線資料同步
 */
class OfflineSyncService {
  private status: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
  };

  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      // Listen for visibility change to sync when app becomes visible
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      // Initial status update
      this.updatePendingCount();
    }
  }

  /**
   * 訂閱狀態變化
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  /**
   * 取得當前狀態
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * 觸發同步
   */
  async sync(): Promise<{ success: number; failed: number }> {
    if (!this.status.isOnline) {
      console.log('Cannot sync: offline');
      return { success: 0, failed: 0 };
    }

    if (this.status.isSyncing) {
      console.log('Sync already in progress');
      return { success: 0, failed: 0 };
    }

    this.updateStatus({ isSyncing: true, lastError: null });

    try {
      // First, process the sync queue
      const queueResult = await processSyncQueue();

      // Then, sync any unsynced submissions from storage
      const unsyncedSubmissions = getUnsyncedSubmissions();
      let directSyncSuccess = 0;
      let directSyncFailed = 0;

      if (unsyncedSubmissions.length > 0) {
        try {
          const response = await fetch('/api/submissions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissions: unsyncedSubmissions.map((s) => ({
                studentId: s.studentId,
                itemId: s.itemId,
                status: s.status,
              })),
            }),
          });

          if (response.ok) {
            // Mark all as synced
            unsyncedSubmissions.forEach((s) => {
              markSubmissionSynced(s.itemId, s.studentId);
            });
            directSyncSuccess = unsyncedSubmissions.length;
          } else {
            directSyncFailed = unsyncedSubmissions.length;
          }
        } catch (error) {
          console.error('Direct sync failed:', error);
          directSyncFailed = unsyncedSubmissions.length;
        }
      }

      const totalSuccess = queueResult.success + directSyncSuccess;
      const totalFailed = queueResult.failed + directSyncFailed;

      this.updateStatus({
        isSyncing: false,
        lastSyncTime: new Date(),
        lastError: totalFailed > 0 ? `${totalFailed} 筆同步失敗` : null,
      });

      this.updatePendingCount();

      return { success: totalSuccess, failed: totalFailed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '同步失敗';
      this.updateStatus({
        isSyncing: false,
        lastError: errorMessage,
      });
      return { success: 0, failed: 0 };
    }
  }

  /**
   * 開始自動同步
   */
  startAutoSync(intervalMs: number = 30000): void {
    this.stopAutoSync();
    this.syncInterval = setInterval(() => {
      if (this.status.isOnline && !this.status.isSyncing) {
        this.sync();
      }
    }, intervalMs);
  }

  /**
   * 停止自動同步
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * 清理資源
   */
  destroy(): void {
    this.stopAutoSync();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.listeners.clear();
  }

  private handleOnline = (): void => {
    this.updateStatus({ isOnline: true });
    // Auto-sync when coming back online
    this.sync();
  };

  private handleOffline = (): void => {
    this.updateStatus({ isOnline: false });
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.status.isOnline) {
      // Sync when app becomes visible
      this.sync();
    }
  };

  private updateStatus(updates: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyListeners();
  }

  private updatePendingCount(): void {
    const queueSize = getQueueSize();
    const unsyncedCount = getUnsyncedSubmissions().length;
    this.updateStatus({ pendingCount: queueSize + unsyncedCount });
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.status));
  }
}

// Singleton instance
let syncService: OfflineSyncService | null = null;

export function getSyncService(): OfflineSyncService {
  if (!syncService && typeof window !== 'undefined') {
    syncService = new OfflineSyncService();
  }
  return syncService!;
}

export function destroySyncService(): void {
  if (syncService) {
    syncService.destroy();
    syncService = null;
  }
}

export default getSyncService;

