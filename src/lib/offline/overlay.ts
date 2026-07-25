import { OfflineRecordEntry, OfflineSyncQueueItem, SubmissionStatus } from '@/types';
import { computeIsAssignedRecorder } from '@/lib/task';

/**
 * Overlay 疊加（remediation §3 藥方一）：
 *   畫面顯示值 = base（伺服器鏡像）⊕ overlay（未同步變更集）
 *
 * 兩層各一個 owner：base（records 快取）只由 `cacheSyncedRecords` 寫、overlay（syncQueue）
 * 只由登記操作寫。畫面是兩者疊加的**派生值，不另存**。這讓重連 refetch 整包覆蓋 base 時，
 * 未同步的登記仍住在 overlay，refetch 碰不到它（解臉 B / 臉 C-record）。
 *
 * 對每個 studentId：
 *   - 佇列有此學生的待送 op → 顯示 op 值（刪除意圖 → 視為「沒登記」，從結果移除）
 *   - 否則 → 顯示 base 快取值
 *
 * 前提：`addToSyncQueue` 保證同一 (taskId, studentId) 佇列中最多一筆 op，故疊加無歧義。
 *
 * @param base 該任務的 records 快取（key = 被登記學生的 studentId）
 * @param taskOps 該任務的待同步佇列項（呼叫端已依 taskId 過濾）
 * @param assignedSeatNumber 任務指定小老師座號，用於推導 overlay-only 記錄的 isAssignedRecorder
 */
export function mergeRecords(
  base: { [studentId: string]: OfflineRecordEntry },
  taskOps: OfflineSyncQueueItem[],
  assignedSeatNumber?: number | null
): { [studentId: string]: OfflineRecordEntry } {
  // 無待送 op：直接回 base（保留原參照，利於 React memo 穩定）
  if (taskOps.length === 0) return base;

  const merged: { [studentId: string]: OfflineRecordEntry } = { ...base };

  for (const op of taskOps) {
    const { studentId, submissionStatus, gradeValue, recorderSeatNumber } = op.payload;

    const isSubmitted = submissionStatus === SubmissionStatus.SUBMITTED;
    const isGraded = typeof gradeValue === 'number';

    // 刪除意圖（取消勾選 / 清空成績）→ 顯示成「沒登記」
    if (!isSubmitted && !isGraded) {
      delete merged[studentId];
      continue;
    }

    merged[studentId] = {
      submissionStatus: isSubmitted ? SubmissionStatus.SUBMITTED : undefined,
      gradeValue: isGraded ? gradeValue : undefined,
      recorderSeatNumber,
      isAssignedRecorder: computeIsAssignedRecorder(assignedSeatNumber, recorderSeatNumber),
      updatedAt: op.createdAt,
      synced: false,
    };
  }

  return merged;
}
