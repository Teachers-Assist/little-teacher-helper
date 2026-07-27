'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { OfflineData, OfflineRecordEntry, Student, Task } from '@/types';
import { subscribe, getSnapshot, getServerSnapshot } from './storage';
import { mergeRecords } from './overlay';
import { isOpFailed } from './queue';
import {
  subscribeSync,
  getSyncRuntime,
  getSyncRuntimeServer,
  requestSync,
} from './syncController';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * 訂閱整份離線資料快照。其他 hook 在此之上以 useMemo 取切片，
 * 切片只在資料寫入（快照參照改變）時重算。
 */
function useOfflineData(): OfflineData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// 缺資料時回傳的穩定空值，避免每次渲染產生新參照
const EMPTY_STUDENTS: Student[] = [];
const EMPTY_TASKS: Task[] = [];
const EMPTY_RECORDS: { [studentId: string]: OfflineRecordEntry } = {};

/**
 * 本機快取的房間資料（含本次座號），不存在時為 null。
 */
export function useOfflineRoom(roomId: string) {
  const data = useOfflineData();
  return useMemo(() => data.rooms[roomId] ?? null, [data, roomId]);
}

/**
 * 本機快取的學生列表。
 */
export function useOfflineStudents(roomId: string): Student[] {
  const data = useOfflineData();
  return useMemo(() => data.students[roomId] ?? EMPTY_STUDENTS, [data, roomId]);
}

/**
 * 本機快取的任務列表。
 */
export function useOfflineTasks(roomId: string): Task[] {
  const data = useOfflineData();
  return useMemo(() => data.tasks[roomId] ?? EMPTY_TASKS, [data, roomId]);
}

/**
 * 本機快取中的單一任務，不存在時為 null。
 */
export function useOfflineTask(roomId: string, taskId: string): Task | null {
  const tasks = useOfflineTasks(roomId);
  return useMemo(() => tasks.find((t) => t.id === taskId) ?? null, [tasks, taskId]);
}

/**
 * 某任務在本機的所有登記記錄（key 為被登記學生 id）。
 *
 * 值為 overlay 疊加的派生結果：records 快取（base，伺服器鏡像）疊上 syncQueue 中此任務的
 * 待送 op（overlay，未同步變更集）。因此重連 refetch 整包覆蓋 base 時，未同步登記仍顯示。
 * 見 `overlay.ts` 的 `mergeRecords`。
 */
export function useOfflineRecords(
  taskId: string,
  assignedSeatNumber?: number | null
): { [studentId: string]: OfflineRecordEntry } {
  const data = useOfflineData();
  return useMemo(() => {
    const base = data.records[taskId] ?? EMPTY_RECORDS;
    const taskOps = data.syncQueue.filter(
      (op) => op.type === 'UPDATE_RECORD' && op.payload.taskId === taskId
    );
    return mergeRecords(base, taskOps, assignedSeatNumber);
  }, [data, taskId, assignedSeatNumber]);
}

/**
 * 同步狀態：待同步筆數來自離線資料 store（reactive），
 * isSyncing / lastSyncTime 來自同步執行期 store，皆為訂閱驅動（不再輪詢）。
 */
export function useSyncStatus() {
  const data = useOfflineData();
  const runtime = useSyncExternalStore(subscribeSync, getSyncRuntime, getSyncRuntimeServer);
  const { isOnline } = useNetworkStatus();

  // 失敗態（004 US1）：不可重試或重試耗盡的 op 數。這些 op 仍在佇列（未靜默移除），
  // 重整會重置判定並再試一次（S11）。
  const failedCount = data.syncQueue.filter(isOpFailed).length;

  return {
    pendingCount: data.syncQueue.length,
    failedCount,
    isSyncing: runtime.isSyncing,
    lastSyncTime: runtime.lastSyncTime,
    isOnline,
    sync: requestSync,
  };
}
