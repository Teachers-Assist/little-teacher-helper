import { SubmissionStatus, UpdateRecordInput } from '@/types';
import { computeIsAssignedRecorder, resolveRecordMutation } from '@/lib/task';
import { getOfflineData, saveOfflineData, saveRecord, removeRecord } from './storage';

const MAX_RETRY_COUNT = 3;

function generateUUID(): string {
  return crypto.randomUUID();
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

  if (existingIndex >= 0) {
    data.syncQueue[existingIndex] = {
      ...data.syncQueue[existingIndex],
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
  } else {
    data.syncQueue.push({
      id: generateUUID(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
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

  const mutation = resolveRecordMutation(task.type, { submissionStatus, gradeValue });
  if (!mutation.ok) {
    return { ok: false, error: mutation.error };
  }

  if (mutation.action === 'delete') {
    removeRecord(task.id, studentId);
  } else {
    saveRecord(task.id, studentId, {
      submissionStatus: mutation.data.submissionStatus ?? undefined,
      gradeValue: mutation.data.gradeValue ?? undefined,
      recorderSeatNumber,
      isAssignedRecorder: computeIsAssignedRecorder(task.assignedSeatNumber, recorderSeatNumber),
    });
  }

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
      const entry = data.records[op.payload.taskId]?.[op.payload.studentId];
      if (entry) entry.synced = true; // delete 類操作已無快取記錄，略過
    } else if (pending.some((p) => p.id === op.id)) {
      op.retryCount++; // 只對本次嘗試過、卻沒成功的操作累加重試
    }
  }
  data.syncQueue = data.syncQueue.filter((op) => !syncedIds.has(op.id));
  saveOfflineData(data);

  return { success: syncedIds.size, failed: pending.length - syncedIds.size };
}
