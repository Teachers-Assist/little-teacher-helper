import { OfflineData, OfflineSyncQueueItem, SubmissionStatus, UpdateRecordInput } from '@/types';
import { resolveRecordMutation } from '@/lib/task';
import { getOfflineData, saveOfflineData } from './storage';
import { applyAckedOp } from './overlay';
import { NON_RETRYABLE_ERROR_CODES, type ErrorCode } from '@/i18n/errorCodes';

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
 * 重置佇列所有 op 的**重試判定**（retryCount 歸零、清除 nonRetryable），但**保留所有 op**。
 *
 * 供頁面載入時呼叫（FR-079 / INV-2 / NFR-013）：重試判定為 session 範圍、刻意不持久化，
 * 每次載入重置並重試一次——支援老師重新開放任務後，學生只要重整即自動重送卡住的登記，
 * 無需重新登記。未送出的佇列資料一律保留、永不因此清除。
 *
 * @returns 是否有任何 op 的判定被重置（供呼叫端決定要不要接著觸發同步）
 */
export function resetRetryJudgment(): boolean {
  const data = getOfflineData();
  let changed = false;
  data.syncQueue = data.syncQueue.map((op) => {
    if (op.retryCount !== 0 || op.nonRetryable) {
      changed = true;
      return { ...op, retryCount: 0, nonRetryable: false };
    }
    return op;
  });
  if (changed) saveOfflineData(data);
  return changed;
}

export interface SyncConflict {
  operationId: string;
  reason: string; // ERROR_CODES 碼值（FR-112）
}

/**
 * 同步回應的 reconciliation（純函式，S10 核心，供測試）。把「送出當下的快照」（sentRev、
 * attemptedIds）與「回應」（acked、conflicts）套用到「當前佇列」（可能於飛行期間已被改動）。
 *
 * 規則（每筆佇列 op）：
 *   1. 未在本輪送出（飛行期間新增）→ 原封保留（解臉 C：不被舊快照誤判）
 *   2. 本輪送出且被 ack：
 *        - rev 已變（飛行期間被改）→ **不 ack、保留**，下輪送最新 payload（解臉 A：新值不蒸發）
 *        - rev 未變 → applyAckedOp 沉澱到 base、移出佇列（success）
 *   3. 本輪送出且列為衝突：
 *        - 不可重試（碼 ∈ NON_RETRYABLE）→ 標記 nonRetryable、**保留**（INV-1 不靜默移除）
 *        - 可重試 → retryCount +1、保留
 *   4. 本輪送出但回應既未 ack 也未列衝突（網路中斷 / 500 / 遺漏）→ 暫時性，retryCount +1、保留
 *
 * records 就地更新（acked upsert/delete）；回傳新佇列與計數。**任何情況都不刪除未成功的 op。**
 */
export function reconcileSync(params: {
  queue: OfflineSyncQueueItem[];
  records: OfflineData['records'];
  sentRev: Record<string, number>;
  acked: Set<string>;
  conflicts: SyncConflict[];
  attemptedIds: Set<string>;
}): { nextQueue: OfflineSyncQueueItem[]; success: number; failed: number } {
  const { queue, records, sentRev, acked, conflicts, attemptedIds } = params;
  const conflictReason = new Map(conflicts.map((c) => [c.operationId, c.reason]));

  const nextQueue: OfflineSyncQueueItem[] = [];
  let success = 0;

  for (const op of queue) {
    if (!attemptedIds.has(op.id)) {
      nextQueue.push(op); // (1) 飛行期間新增，本輪未送
      continue;
    }

    const stale = op.rev !== sentRev[op.id]; // 飛行期間被改過

    if (acked.has(op.id)) {
      if (stale) {
        nextQueue.push(op); // (2a) ack 的是舊版本 → 保留待重送
      } else {
        applyAckedOp(records, op); // (2b) 安全 ack → 沉澱 base、移出
        success++;
      }
      continue;
    }

    const reason = conflictReason.get(op.id);
    if (reason !== undefined) {
      if (NON_RETRYABLE_ERROR_CODES.has(reason as ErrorCode)) {
        nextQueue.push({ ...op, nonRetryable: true }); // (3) 不可重試 → 標記保留
      } else {
        nextQueue.push({ ...op, retryCount: op.retryCount + 1 }); // (3) 可重試
      }
      continue;
    }

    nextQueue.push({ ...op, retryCount: op.retryCount + 1 }); // (4) 暫時性
  }

  return { nextQueue, success, failed: attemptedIds.size - success };
}

/**
 * 批次同步整個佇列：一次送往 /api/sync，回應以 reconcileSync 套用。
 *
 * 送出前記下 sentRev 與 attemptedIds（快照），await 後**重讀**佇列再 reconcile——飛行期間
 * 的新增 / 編輯因此被正確處理（版本戳 + attemptedIds，解臉 A/C）。不可重試與重試耗盡的 op
 * 一律**保留於佇列並標記狀態**，永不靜默移除（INV-1 / SC-019）。
 */
export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  const pending = getOfflineData().syncQueue.filter(
    (op) => !op.nonRetryable && op.retryCount < MAX_RETRY_COUNT
  );
  if (pending.length === 0) {
    return { success: 0, failed: 0 };
  }

  const sentRev: Record<string, number> = {};
  pending.forEach((op) => {
    sentRev[op.id] = op.rev;
  });
  const attemptedIds = new Set(pending.map((op) => op.id));

  const acked = new Set<string>();
  let conflicts: SyncConflict[] = [];
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
    // 200 / 207 / 409 皆解析 body 的 operationIds 與 conflicts；500 等無這些欄位 → 視為暫時性
    const result = (await response.json().catch(() => ({}))) as {
      operationIds?: string[];
      conflicts?: SyncConflict[];
    };
    result.operationIds?.forEach((id) => acked.add(id));
    conflicts = result.conflicts ?? [];
  } catch (error) {
    // 網路層失敗 → acked / conflicts 皆空 → 所有送出的 op 走暫時性 retry（可重試）
    console.error('Sync failed:', error);
  }

  const data = getOfflineData(); // 重讀（飛行期間可能已被改動）
  const { nextQueue, success, failed } = reconcileSync({
    queue: data.syncQueue,
    records: data.records,
    sentRev,
    acked,
    conflicts,
    attemptedIds,
  });
  data.syncQueue = nextQueue;
  saveOfflineData(data);

  return { success, failed };
}
