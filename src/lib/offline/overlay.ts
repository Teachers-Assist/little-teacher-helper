import { OfflineData, OfflineRecordEntry, OfflineSyncQueueItem, SubmissionStatus } from '@/types';
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

/**
 * 同步成功後，把已 ack 的 op 從 overlay「沉澱」到 base 快取（overlay 模型：ack 後該變更
 * 成為伺服器已知狀態）。移除雙寫後，登記只入佇列、不寫 base，因此成功時必須在此寫回 base，
 * 否則該筆會在 op 移出佇列後從畫面消失（要等下次 refetch 才回來）。
 *
 * upsert 或 delete 由 op 的 payload 意圖決定（同 mergeRecords）。
 * isAssignedRecorder 為便捷欄位、學生端不顯示，權威值由下次 `cacheSyncedRecords`（refetch）
 * 校正；此處沿用既有 base 值、無則暫記 false。**就地修改傳入的 records 物件。**
 *
 * 注意：此函式不驗版本（op 是否於飛行期間被改）——那是 S10 版本戳的職責。此步只解決
 * 「移除雙寫後成功記錄消失」的問題，不改動既有的成功判定方式。
 */
export function applyAckedOp(records: OfflineData['records'], op: OfflineSyncQueueItem): void {
  const { taskId, studentId, submissionStatus, gradeValue, recorderSeatNumber } = op.payload;

  const isSubmitted = submissionStatus === SubmissionStatus.SUBMITTED;
  const isGraded = typeof gradeValue === 'number';

  if (!isSubmitted && !isGraded) {
    if (records[taskId]) delete records[taskId][studentId];
    return;
  }

  if (!records[taskId]) records[taskId] = {};
  const prev = records[taskId][studentId];
  records[taskId][studentId] = {
    submissionStatus: isSubmitted ? SubmissionStatus.SUBMITTED : undefined,
    gradeValue: isGraded ? gradeValue : undefined,
    recorderSeatNumber,
    isAssignedRecorder: prev?.isAssignedRecorder ?? false,
    updatedAt: op.createdAt,
    synced: true,
  };
}
