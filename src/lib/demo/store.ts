'use client';

// 006 推廣示範沙盒——本機反應式 store（T603，方案 B2）。
//
// 平行於正式 `src/lib/offline/store.ts`，但載體為 **sessionStorage `little-helper-demo`**、
// 「上傳」為 **BroadcastChannel**（不碰 D1、不動正式 localStorage）。介面鏡像正式的
// `useOffline*`，讓 `/demo/helper` 能重用小老師端的 props-driven 子元件（RecordForm 等）。
//
// 隔離紅線（plan §1.2 / tasks ISO-1~4）：
//   - 只讀寫 sessionStorage key `little-helper-demo`，MUST NOT 觸碰 `little-helper-offline-data`
//   - 「同步」只走注入的 broadcaster（頁面接 channel.ts），MUST NOT 呼叫任何 /api/*

import { useMemo, useSyncExternalStore } from 'react';
import type { OfflineRecordEntry, Task } from '@/types';
import { detectAnomalies, type Anomaly } from '@/lib/anomalyDetection';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { createDemoSeed, DEMO_ROOM, type DemoSeed } from './seed';

const STORAGE_KEY = 'little-helper-demo';

interface DemoPendingOp {
  taskId: string;
  studentId: string;
  entry: OfflineRecordEntry | null; // null = 刪除該筆（取消勾選 / 清空成績）
}

interface DemoData {
  seatNumber: number;
  records: { [taskId: string]: { [studentId: string]: OfflineRecordEntry } };
  pending: DemoPendingOp[]; // 待同步（離線登記累積；線上時為空）
}

// 本 session 固定基準時間（模組載入時算一次，非 render 期間）——種子時間戳與異常判定共用同一
// 基準，確保任務 C 的「idle ≈ 25h」穩定觸發規則一，且不在 render 內呼叫 Date.now()
// （react-hooks/purity）。
const SEED_NOW = Date.now();

// 本 session 固定種子：提供 students / tasks（不變）與初始 records。
const seed: DemoSeed = createDemoSeed(SEED_NOW);

function clone<T>(d: T): T {
  return JSON.parse(JSON.stringify(d)) as T;
}

function createInitial(): DemoData {
  return {
    seatNumber: seed.assignedSeat,
    records: clone(seed.records),
    pending: [],
  };
}

// ===== 反應式訂閱層（仿正式 storage.ts）=====
let cache: DemoData | null = null;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: DemoData = createInitial();

function read(): DemoData {
  if (typeof window === 'undefined') return createInitial();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoData) : createInitial();
  } catch {
    return createInitial(); // 讀取失敗：退回初始種子（demo 從簡）
  }
}

function write(data: DemoData): void {
  cache = data; // 每次寫入皆為新參照 → 觸發 useSyncExternalStore 重新渲染
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 無痕 / 配額失敗：demo 從簡，畫面照常更新、僅不持久化
    }
  }
  listeners.forEach((l) => l());
}

export function subscribeDemo(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDemoSnapshot(): DemoData {
  if (cache === null) cache = read();
  return cache;
}

export function getDemoServerSnapshot(): DemoData {
  return SERVER_SNAPSHOT;
}

// ===== broadcaster 注入（頁面接 channel.ts；store 不直接依賴 channel，避免耦合）=====
type Broadcaster = (
  taskId: string,
  records: { [studentId: string]: OfflineRecordEntry | null }
) => void;
let broadcaster: Broadcaster | null = null;

/** 頁面在建立 BroadcastChannel 後注入 post 函式；傳 null 解除。 */
export function setDemoBroadcaster(fn: Broadcaster | null): void {
  broadcaster = fn;
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function applyToRecords(
  data: DemoData,
  taskId: string,
  studentId: string,
  entry: OfflineRecordEntry | null
): void {
  if (entry === null) {
    if (data.records[taskId]) delete data.records[taskId][studentId];
  } else {
    data.records[taskId] = { ...(data.records[taskId] ?? {}), [studentId]: entry };
  }
}

// ===== 寫入 API =====

/** 小老師端換座號 / 選座號。 */
export function setDemoSeat(seat: number): void {
  const data = clone(getDemoSnapshot());
  data.seatNumber = seat;
  write(data);
}

/**
 * 登記一筆（entry=null 表示取消勾選 / 清空成績）。
 * 線上：直接進 records 並 broadcast 給老師端視窗。
 * 離線：進 pending（待同步），hold 住不 broadcast——用真實網路狀態 gate 同步時機。
 */
export function upsertDemoRecord(
  taskId: string,
  studentId: string,
  entry: OfflineRecordEntry | null
): void {
  const data = clone(getDemoSnapshot());
  if (isOnline()) {
    applyToRecords(data, taskId, studentId, entry);
    write(data);
    broadcaster?.(taskId, { [studentId]: entry });
  } else {
    data.pending = data.pending.filter(
      (p) => !(p.taskId === taskId && p.studentId === studentId)
    );
    data.pending.push({ taskId, studentId, entry });
    write(data);
  }
}

/** 重連後把待同步佇列依序套入 records 並 broadcast（online 事件觸發）。 */
export function flushDemoPending(): void {
  const data = clone(getDemoSnapshot());
  if (data.pending.length === 0) return;
  const touched: { [taskId: string]: { [studentId: string]: OfflineRecordEntry | null } } = {};
  for (const op of data.pending) {
    applyToRecords(data, op.taskId, op.studentId, op.entry);
    (touched[op.taskId] ??= {})[op.studentId] = op.entry;
  }
  data.pending = [];
  write(data);
  for (const taskId of Object.keys(touched)) broadcaster?.(taskId, touched[taskId]);
}

/** 老師端視窗收到 BroadcastChannel 訊息時套入自己的 records。 */
export function applyDemoIncoming(
  taskId: string,
  records: { [studentId: string]: OfflineRecordEntry | null }
): void {
  const data = clone(getDemoSnapshot());
  for (const [studentId, entry] of Object.entries(records)) {
    applyToRecords(data, taskId, studentId, entry);
  }
  write(data);
}

/** 「還原狀態」：清回初始種子（FR-151）。 */
export function resetDemo(): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略：下方 write 會以初始種子覆蓋記憶體快照
    }
  }
  write(createInitial());
}

// 重連自動 flush（仿 syncController 的 online 監聽；不輪詢）。
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushDemoPending());
}

// ===== Hooks（鏡像正式 useOffline*）=====

function useDemoData(): DemoData {
  return useSyncExternalStore(subscribeDemo, getDemoSnapshot, getDemoServerSnapshot);
}

export function useDemoRoom(): typeof DEMO_ROOM {
  return DEMO_ROOM;
}

export function useDemoStudents() {
  return seed.students;
}

export function useDemoTasks() {
  return seed.tasks;
}

export function useDemoTask(taskId: string) {
  return useMemo(() => seed.tasks.find((t) => t.id === taskId) ?? null, [taskId]);
}

export function useDemoSeat(): number {
  return useDemoData().seatNumber;
}

/** records（base）⊕ pending（overlay，未同步變更蓋過 base）——純函式，供 hooks 共用。 */
function mergeTaskRecords(
  data: DemoData,
  taskId: string
): { [studentId: string]: OfflineRecordEntry } {
  const result: { [studentId: string]: OfflineRecordEntry } = { ...(data.records[taskId] ?? {}) };
  for (const op of data.pending) {
    if (op.taskId !== taskId) continue;
    if (op.entry === null) delete result[op.studentId];
    else result[op.studentId] = op.entry;
  }
  return result;
}

/** 某任務的登記記錄（overlay 派生）。 */
export function useDemoRecords(taskId: string): { [studentId: string]: OfflineRecordEntry } {
  const data = useDemoData();
  return useMemo(() => mergeTaskRecords(data, taskId), [data, taskId]);
}

export interface DemoTaskStat {
  task: Task;
  recordedCount: number;
  studentCount: number;
  anomalies: Anomaly[];
}

export interface DemoTeacherView {
  stats: { total: number; inProgress: number; anomalies: number; archived: number };
  taskStats: DemoTaskStat[];
}

/**
 * 老師端彙整：各任務登記進度 + 由**真實 `detectAnomalies`** 算出的異常（FR-145）。
 * 任務 C 零登記且 createdAt 逾 24h → 觸發規則一 TASK_STALLED。
 */
export function useDemoTeacherView(): DemoTeacherView {
  const data = useDemoData();
  return useMemo(() => {
    const studentCount = seed.students.filter((s) => !s.isRemoved).length;
    const taskStats: DemoTaskStat[] = seed.tasks.map((task) => {
      const merged = mergeTaskRecords(data, task.id);
      const entries = Object.values(merged);
      const lastRecordActivityAt = entries.reduce<string | null>(
        (max, e) => (!max || e.updatedAt > max ? e.updatedAt : max),
        null
      );
      const anomalies = detectAnomalies(
        {
          status: task.status,
          isArchived: task.isArchived,
          dueDate: task.dueDate ?? null,
          createdAt: task.createdAt,
          recordedCount: entries.length,
          classStudentCount: studentCount,
          lastRecordActivityAt,
        },
        SEED_NOW
      );
      return { task, recordedCount: entries.length, studentCount, anomalies };
    });
    return {
      stats: {
        total: taskStats.length,
        inProgress: taskStats.filter((t) => t.task.status === 'ACTIVE').length,
        anomalies: taskStats.filter((t) => t.anomalies.length > 0).length,
        archived: 0,
      },
      taskStats,
    };
  }, [data]);
}

/** 同步狀態：待同步筆數 + 連線狀態（供 SyncIndicator 呈現）。 */
export function useDemoSyncStatus() {
  const data = useDemoData();
  const { isOnline: online } = useNetworkStatus();
  return { pendingCount: data.pending.length, isOnline: online };
}
