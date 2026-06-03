import { processSyncQueue } from './queue';

/**
 * 同步的執行期狀態（非持久化，不存在 localStorage）。
 * 待同步筆數（pendingCount）改由離線資料 store 的 syncQueue 長度反應，不放在這裡。
 */
export interface SyncRuntime {
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

let runtime: SyncRuntime = { isSyncing: false, lastSyncTime: null };
const listeners = new Set<() => void>();

// SSR / 首次水合用的固定參照
const SERVER_RUNTIME: SyncRuntime = { isSyncing: false, lastSyncTime: null };

function setRuntime(updates: Partial<SyncRuntime>): void {
  runtime = { ...runtime, ...updates };
  listeners.forEach((listener) => listener());
}

/**
 * 訂閱同步執行期狀態（給 useSyncExternalStore 使用）
 */
export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncRuntime(): SyncRuntime {
  return runtime;
}

export function getSyncRuntimeServer(): SyncRuntime {
  return SERVER_RUNTIME;
}

/**
 * 觸發一次同步：批次送出待同步佇列。離線或同步進行中時略過（去重、避免重入）。
 * processSyncQueue 會寫回離線資料 store，因此 pendingCount 會自動更新。
 */
export async function requestSync(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (runtime.isSyncing) return;

  setRuntime({ isSyncing: true });
  try {
    await processSyncQueue();
    setRuntime({ isSyncing: false, lastSyncTime: new Date() });
  } catch (error) {
    console.error('Sync failed:', error);
    setRuntime({ isSyncing: false });
  }
}

// 自動同步：恢復連線或分頁重新可見時送出佇列。
// 取代原 OfflineSyncService 與 useOfflineSync 的 5 秒輪詢 / 重連副作用。
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    requestSync();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      requestSync();
    }
  });
}
