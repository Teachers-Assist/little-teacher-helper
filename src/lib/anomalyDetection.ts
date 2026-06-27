// 任務異常偵測（002 US4 / US8，FR-035）。
//
// MVP 階段只實作可用現有資料模型判斷的兩條規則；「裝置長時間未同步」因缺乏
// 裝置心跳資料而略過（見 specs/open-questions.md 2026-06-26）。
//
// 純函式，無 I/O —— monitoring endpoint（US4）與 dashboard endpoint（US8）共用，
// 確保兩處異常判斷一致。

/** 閾值（同步記錄於 specs/002-class-management/plan.md）。 */
export const ANOMALY_THRESHOLDS = {
  /** 指定座號的小老師多久沒登記算異常（自任務建立起算）。 */
  assignedSeatIdleMs: 24 * 60 * 60 * 1000, // 24 小時
  /** 距截止時間多近、且完全無登記算異常。 */
  nearDueMs: 6 * 60 * 60 * 1000, // 6 小時
} as const;

export type AnomalyType = 'ASSIGNED_SEAT_IDLE' | 'NO_RECORDS_NEAR_DUE';

export interface AnomalyInput {
  status: string;
  isArchived: boolean;
  assignedSeatNumber: number | null;
  dueDate: Date | string | null;
  createdAt: Date | string;
  recordedCount: number;
  /** 是否已有「任務指定的小老師」所做的登記。 */
  assignedRecorderHasRecord: boolean;
}

export interface Anomaly {
  type: AnomalyType;
  /** 指定座號（ASSIGNED_SEAT_IDLE 才有）。 */
  assignedSeatNumber?: number;
  /** 距截止剩餘毫秒（NO_RECORDS_NEAR_DUE 才有）。 */
  msToDue?: number;
}

/**
 * 偵測單一任務的異常。已封存或非 ACTIVE 的任務不判異常（已結案 / 已完成不需提醒）。
 */
export function detectAnomalies(task: AnomalyInput, now: number = Date.now()): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (task.isArchived || task.status !== 'ACTIVE') return anomalies;

  // 1. 指定座號 24h 無登記
  if (task.assignedSeatNumber != null && !task.assignedRecorderHasRecord) {
    const age = now - new Date(task.createdAt).getTime();
    if (age >= ANOMALY_THRESHOLDS.assignedSeatIdleMs) {
      anomalies.push({ type: 'ASSIGNED_SEAT_IDLE', assignedSeatNumber: task.assignedSeatNumber });
    }
  }

  // 2. 所有人未登記且距截止 < 6h（尚未過截止）
  if (task.dueDate && task.recordedCount === 0) {
    const msToDue = new Date(task.dueDate).getTime() - now;
    if (msToDue > 0 && msToDue < ANOMALY_THRESHOLDS.nearDueMs) {
      anomalies.push({ type: 'NO_RECORDS_NEAR_DUE', msToDue });
    }
  }

  return anomalies;
}
