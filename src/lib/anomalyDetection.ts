// 任務異常偵測（004 US6 重整；002 US4/US8 建立）。
//
// 純函式，無 I/O —— monitoring endpoint 與 dashboard endpoint 共用，確保兩處判斷一致
// （NFR-015）。DB 過濾（排除 isRemoved 學生、納入哪些 status）由 endpoint 負責。
// 規則的單一真實來源見 specs/anomaly-rules.md。
//
// 規則一（TASK_STALLED）：任務層級停擺——距「最後一次登記活動」超過閾值（無登記則自建立
//   時間起算，滑動視窗）。不要求指定小老師、不要求設截止；全班登滿則不判。此規則同時是
//   「裝置長時間未同步」的代理指標（004 US6，推翻原需裝置心跳的結論）。
// 規則二（NO_RECORDS_BY_DUE）：有截止日、已過「截止日當天 08:00（Asia/Taipei）」且全班零
//   登記。取代舊的「距截止 6h」相對閾值；僅適用 08:00 前已建立的任務。

import { taipeiDayStartAt } from '@/lib/timezone';

export const ANOMALY_THRESHOLDS = {
  /** 規則一：距最後一次登記活動多久未動算停擺。 */
  taskStalledMs: 24 * 60 * 60 * 1000, // 24 小時
  /** 規則二：截止日當天幾點（台北）起，全班零登記即示警。 */
  dueDayAlertHour: 8, // 08:00
  /** 規則三：標記完成但登記率低於此值即示警（US8，待觀察調參）。 */
  lowCompletionRate: 0.5, // 50%
} as const;

export type AnomalyType = 'TASK_STALLED' | 'NO_RECORDS_BY_DUE' | 'LOW_COMPLETION';

export interface AnomalyInput {
  status: string;
  isArchived: boolean;
  dueDate: Date | string | null;
  createdAt: Date | string;
  /** 已登記筆數（分子）。MUST 由 endpoint 排除 isRemoved 學生的紀錄後傳入（FR-104）。 */
  recordedCount: number;
  /** 班級在籍學生總數（分母）。MUST 只計 isRemoved=false 的學生（FR-104）。 */
  classStudentCount: number;
  /** 最後一次登記活動時間；從未有登記時為 null（滑動視窗起算點退回 createdAt）。 */
  lastRecordActivityAt: Date | string | null;
}

export interface Anomaly {
  type: AnomalyType;
  /** TASK_STALLED：已停擺多久（毫秒），供 UI 顯示已閒置時長（FR-085）。 */
  idleMs?: number;
  /** LOW_COMPLETION：已登記筆數與班級人數，供卡片顯示 N/M（US8）。 */
  recordedCount?: number;
  classStudentCount?: number;
}

/**
 * 偵測單一任務的異常。封存任務一律不判。
 * - ACTIVE：規則一（停擺滑動視窗）、規則二（截止日 08:00 零登記）
 * - HELPER_COMPLETED：規則三（完成但登記率過低，US8）——唯一打破「只判 ACTIVE」共同前提者
 * - CLOSED：不判（老師已親自處理）
 */
export function detectAnomalies(task: AnomalyInput, now: number = Date.now()): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (task.isArchived) return anomalies;

  if (task.status === 'ACTIVE') {
    // 規則一：任務停擺（滑動視窗）。全班登滿則不判（分子分母皆已排除 isRemoved）。
    const isFull = task.classStudentCount > 0 && task.recordedCount >= task.classStudentCount;
    if (!isFull) {
      const anchor = task.lastRecordActivityAt
        ? new Date(task.lastRecordActivityAt).getTime()
        : new Date(task.createdAt).getTime();
      const idleMs = now - anchor;
      if (idleMs >= ANOMALY_THRESHOLDS.taskStalledMs) {
        anomalies.push({ type: 'TASK_STALLED', idleMs });
      }
    }

    // 規則二：截止日當天 08:00（台北）起、全班零登記。僅適用 08:00 前已建立者。
    if (task.dueDate && task.recordedCount === 0) {
      const dueDayStart = taipeiDayStartAt(task.dueDate, ANOMALY_THRESHOLDS.dueDayAlertHour).getTime();
      const createdMs = new Date(task.createdAt).getTime();
      if (createdMs < dueDayStart && now >= dueDayStart) {
        anomalies.push({ type: 'NO_RECORDS_BY_DUE' });
      }
    }
  } else if (task.status === 'HELPER_COMPLETED') {
    // 規則三：標記完成但登記率 < 50%（成績類與繳交類皆適用）。分母 0 不判（避免除以零）。
    if (task.classStudentCount > 0) {
      const rate = task.recordedCount / task.classStudentCount;
      if (rate < ANOMALY_THRESHOLDS.lowCompletionRate) {
        anomalies.push({
          type: 'LOW_COMPLETION',
          recordedCount: task.recordedCount,
          classStudentCount: task.classStudentCount,
        });
      }
    }
  }

  return anomalies;
}
