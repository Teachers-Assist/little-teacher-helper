'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { OfflineData, OfflineRecordEntry, Student, Task } from '@/types';
import { subscribe, getSnapshot, getServerSnapshot } from './storage';
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
 */
export function useOfflineRecords(taskId: string): { [studentId: string]: OfflineRecordEntry } {
  const data = useOfflineData();
  return useMemo(() => data.records[taskId] ?? EMPTY_RECORDS, [data, taskId]);
}

/**
 * 同步狀態：待同步筆數來自離線資料 store（reactive），
 * isSyncing / lastSyncTime 來自同步執行期 store，皆為訂閱驅動（不再輪詢）。
 */
export function useSyncStatus() {
  const data = useOfflineData();
  const runtime = useSyncExternalStore(subscribeSync, getSyncRuntime, getSyncRuntimeServer);
  const { isOnline } = useNetworkStatus();

  return {
    pendingCount: data.syncQueue.length,
    isSyncing: runtime.isSyncing,
    lastSyncTime: runtime.lastSyncTime,
    isOnline,
    sync: requestSync,
  };
}
