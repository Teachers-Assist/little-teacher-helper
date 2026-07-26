import { OfflineSyncQueueItem, SubmissionStatus, UpdateRecordInput } from '@/types';
import { resolveRecordMutation } from '@/lib/task';
import { getOfflineData, saveOfflineData } from './storage';
import { applyAckedOp } from './overlay';

const MAX_RETRY_COUNT = 3;

function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 建立或就地更新一筆佇列 op（純函式，供測試）。
 * - 已存在（同 task+student）：沿用同一 id，換上新 payload、重置 retryCount，**rev + 1**
 *   （版本戳：告訴 S10 的 reconciliation「這筆在飛行期間被改過」）。
 * - 不存在：新建 op，rev = 0。
 */
export function nextSyncOp(
  existing: OfflineSyncQueueItem | undefined,
  type: 'UPDATE_RECORD',
  payload: UpdateRecordInput,
  now: string,
  newId: string
): OfflineSyncQueueItem {
  if (existing) {
    return { ...existing, payload, createdAt: now, retryCount: 0, rev: existing.rev + 1 };
  }
  return { id: newId, type, payload, createdAt: now, retryCount: 0, rev: 0 };
}

/**
 * 新增操作到同步佇列（同一 task+student 只保留最新一筆）
 */
export function addToSyncQueue(type: 'UPDATE_RECORD', payload: UpdateRecordInput): void {
  const data = getOfflineData();

  const existingIndex = data.syncQueue.findIndex(
    (op) =>
      op.type === type &&
      op.payload.taskId === payload.taskId &&
      op.payload.studentId === payload.studentId
  );

  const existing = existingIndex >= 0 ? data.syncQueue[existingIndex] : undefined;
  const op = nextSyncOp(existing, type, payload, new Date().toISOString(), generateUUID());

  if (existingIndex >= 0) {
    data.syncQueue[existingIndex] = op;
  } else {
    data.syncQueue.push(op);
  }

  saveOfflineData(data);
}

/**
 * 登記一筆記錄：同步更新本機快取（依類型決定寫入或刪除）並加入待同步佇列。
 * UI 層只需呼叫此函式，無須分別處理快取與佇列。
 */
export function queueRecordUpdate(params: {
  task: { id: string; type: string; assignedSeatNumber?: number | null };
  studentId: string;
  recorderSeatNumber: number;
  submissionStatus?: SubmissionStatus;
  gradeValue?: number | null;
}): { ok: boolean; error?: string } {
  const { task, studentId, recorderSeatNumber, submissionStatus, gradeValue } = params;

  // 仍用 resolveRecordMutation 驗證輸入（非法成績等），但不再據此寫 records 快取。
  const mutation = resolveRecordMutation(task.type, { submissionStatus, gradeValue });
  if (!mutation.ok) {
    return { ok: false, error: mutation.error };
  }

  // Overlay 模型（INV-3）：登記只入佇列，不寫 records 快取。base 的唯一寫入者是
  // cacheSyncedRecords；畫面顯示由 useOfflineRecords 的 overlay 疊加派生。刪除意圖
  // （取消勾選 / 清空成績）同樣是佇列中的一個 op，overlay 會渲染成「沒登記」。
  addToSyncQueue('UPDATE_RECORD', {
    taskId: task.id,
    studentId,
    submissionStatus,
    gradeValue: gradeValue ?? undefined,
    recorderSeatNumber,
  });

  return { ok: true };
}

/**
 * 待同步操作筆數
 */
export function getQueueSize(): number {
  return getOfflineData().syncQueue.length;
}

/**
 * 批次同步整個佇列：一次送往 /api/sync，再用單次 localStorage 讀寫收尾——
 * 成功的記錄標記 synced 並移出佇列，其餘 retryCount +1（超過上限即停止重試）。
 */
export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  const pending = getOfflineData().syncQueue.filter((op) => op.retryCount < MAX_RETRY_COUNT);
  if (pending.length === 0) {
    return { success: 0, failed: 0 };
  }

  const syncedIds = new Set<string>();
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: pending.map((op) => ({
          id: op.id,
          type: op.type,
          payload: op.payload,
          timestamp: op.createdAt,
        })),
      }),
    });
    if (response.ok) {
      const result = await response.json();
      (result.operationIds as string[] | undefined)?.forEach((id) => syncedIds.add(id));
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }

  const data = getOfflineData();
  for (const op of data.syncQueue) {
    if (syncedIds.has(op.id)) {
      // ack 成功：把 op 從 overlay 沉澱到 base（移除雙寫後，成功記錄需在此寫回 base，
      // 否則移出佇列後會從畫面消失）。upsert/delete 由 payload 意圖決定。
      applyAckedOp(data.records, op);
    } else if (pending.some((p) => p.id === op.id)) {
      op.retryCount++; // 只對本次嘗試過、卻沒成功的操作累加重試
    }
  }
  data.syncQueue = data.syncQueue.filter((op) => !syncedIds.has(op.id));
  saveOfflineData(data);

  return { success: syncedIds.size, failed: pending.length - syncedIds.size };
}
