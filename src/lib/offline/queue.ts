import { OfflineSyncQueueItem, SubmissionStatus, UpdateSubmissionInput } from '@/types';
import { getOfflineData, saveOfflineData } from './storage';

const MAX_RETRY_COUNT = 3;

/**
 * 產生 UUID
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 新增操作到同步佇列
 */
export function addToSyncQueue(
  type: 'UPDATE_SUBMISSION',
  payload: UpdateSubmissionInput
): void {
  const data = getOfflineData();
  
  // Check if there's already a pending operation for this submission
  const existingIndex = data.syncQueue.findIndex(
    (op) =>
      op.type === type &&
      op.payload.studentId === payload.studentId &&
      op.payload.itemId === payload.itemId
  );

  if (existingIndex >= 0) {
    // Update existing operation
    data.syncQueue[existingIndex] = {
      ...data.syncQueue[existingIndex],
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
  } else {
    // Add new operation
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
 * 取得待同步的操作
 */
export function getPendingOperations(): OfflineSyncQueueItem[] {
  const data = getOfflineData();
  return data.syncQueue.filter((op) => op.retryCount < MAX_RETRY_COUNT);
}

/**
 * 移除已完成的操作
 */
export function removeFromSyncQueue(operationId: string): void {
  const data = getOfflineData();
  data.syncQueue = data.syncQueue.filter((op) => op.id !== operationId);
  saveOfflineData(data);
}

/**
 * 增加操作的重試次數
 */
export function incrementRetryCount(operationId: string): void {
  const data = getOfflineData();
  const operation = data.syncQueue.find((op) => op.id === operationId);
  if (operation) {
    operation.retryCount++;
    saveOfflineData(data);
  }
}

/**
 * 取得佇列大小
 */
export function getQueueSize(): number {
  const data = getOfflineData();
  return data.syncQueue.length;
}

/**
 * 清空同步佇列
 */
export function clearSyncQueue(): void {
  const data = getOfflineData();
  data.syncQueue = [];
  saveOfflineData(data);
}

/**
 * 批次處理同步佇列
 */
export async function processSyncQueue(): Promise<{
  success: number;
  failed: number;
}> {
  const operations = getPendingOperations();
  let success = 0;
  let failed = 0;

  for (const operation of operations) {
    try {
      const response = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissions: [operation.payload],
        }),
      });

      if (response.ok) {
        removeFromSyncQueue(operation.id);
        success++;
      } else {
        incrementRetryCount(operation.id);
        failed++;
      }
    } catch (error) {
      console.error('Sync operation failed:', error);
      incrementRetryCount(operation.id);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 批次同步所有待處理的操作
 */
export async function syncAll(): Promise<{
  success: number;
  failed: number;
}> {
  const operations = getPendingOperations();
  
  if (operations.length === 0) {
    return { success: 0, failed: 0 };
  }

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: operations.map((op) => ({
          id: op.id,
          type: op.type,
          payload: op.payload,
          timestamp: op.createdAt,
        })),
      }),
    });

    if (response.ok) {
      const result = await response.json();
      // Remove synced operations
      result.operationIds?.forEach((id: string) => {
        removeFromSyncQueue(id);
      });
      return {
        success: result.synced || 0,
        failed: operations.length - (result.synced || 0),
      };
    } else {
      // Increment retry count for all operations
      operations.forEach((op) => incrementRetryCount(op.id));
      return { success: 0, failed: operations.length };
    }
  } catch (error) {
    console.error('Batch sync failed:', error);
    operations.forEach((op) => incrementRetryCount(op.id));
    return { success: 0, failed: operations.length };
  }
}

