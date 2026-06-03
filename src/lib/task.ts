// 任務（Task）與登記記錄（Record）的共用領域邏輯。
// API、離線層、UI 共用，避免規則散落各處。

import { TaskType, TaskStatus, SubmissionStatus } from '@/types';

export interface TaskLike {
  status: string;
  dueDate?: Date | string | null;
  assignedSeatNumber?: number | null;
}

/**
 * 任務的鎖定原因（小老師無法修改記錄）。
 * - 'COMPLETED'：小老師已標記完成或老師已結案
 * - 'DUE_PASSED'：截止時間已過（status 仍可能為 ACTIVE）
 * - null：未鎖定
 */
export function getTaskLockReason(task: TaskLike): 'COMPLETED' | 'DUE_PASSED' | null {
  if (task.status === TaskStatus.HELPER_COMPLETED || task.status === TaskStatus.CLOSED) {
    return 'COMPLETED';
  }
  if (task.dueDate && new Date(task.dueDate).getTime() < Date.now()) {
    return 'DUE_PASSED';
  }
  return null;
}

/** 登記者是否為任務指定的小老師（任務未指定時恆為 false）。 */
export function computeIsAssignedRecorder(
  assignedSeatNumber: number | null | undefined,
  recorderSeatNumber: number
): boolean {
  return assignedSeatNumber != null && assignedSeatNumber === recorderSeatNumber;
}

export const GRADE_MIN = 0;
export const GRADE_MAX = 100;

export interface RecordValue {
  submissionStatus?: SubmissionStatus | null;
  gradeValue?: number | null;
}

/**
 * 一筆登記操作對資料的影響：寫入一筆記錄，或刪除既有記錄。
 *
 * 繳交類型的記錄只存在「已繳交」一種狀態——勾選＝upsert 一筆 SUBMITTED，
 * 取消勾選＝刪除記錄。「未繳交」是畫面從「查無記錄」推導的，不存 NOT_SUBMITTED。
 */
export type RecordMutation =
  | { ok: true; action: 'upsert'; data: RecordValue }
  | { ok: true; action: 'delete' }
  | { ok: false; error: string };

/**
 * 依任務類型，將一筆登記輸入解析成對資料的操作（寫入或刪除）。
 * - SUBMISSION：SUBMITTED → upsert；NOT_SUBMITTED → delete
 * - GRADE：0-100 整數 → upsert；清空（null/空字串）→ delete
 */
export function resolveRecordMutation(
  type: string,
  value: { submissionStatus?: unknown; gradeValue?: unknown }
): RecordMutation {
  if (type === TaskType.SUBMISSION) {
    const status = value.submissionStatus;
    if (status === SubmissionStatus.SUBMITTED) {
      return { ok: true, action: 'upsert', data: { submissionStatus: SubmissionStatus.SUBMITTED, gradeValue: null } };
    }
    if (status === SubmissionStatus.NOT_SUBMITTED) {
      return { ok: true, action: 'delete' };
    }
    return { ok: false, error: 'submissionStatus 必須為 SUBMITTED 或 NOT_SUBMITTED' };
  }

  if (type === TaskType.GRADE) {
    const grade = value.gradeValue;
    // 清空成績（小老師刪掉數字）視為「沒登記過」→ 刪除記錄，而非存空值
    if (grade === null || grade === undefined || grade === '') {
      return { ok: true, action: 'delete' };
    }
    if (typeof grade !== 'number' || !Number.isInteger(grade)) {
      return { ok: false, error: '成績必須為整數' };
    }
    if (grade < GRADE_MIN || grade > GRADE_MAX) {
      return { ok: false, error: `成績必須在 ${GRADE_MIN}-${GRADE_MAX} 之間` };
    }
    return { ok: true, action: 'upsert', data: { submissionStatus: null, gradeValue: grade } };
  }

  return { ok: false, error: '未知的任務類型' };
}
