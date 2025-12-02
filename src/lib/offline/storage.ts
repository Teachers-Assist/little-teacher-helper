import { OfflineData, OfflineSyncQueueItem, SubmissionStatus, Student, Item } from '@/types';

const STORAGE_KEY = 'little-helper-offline-data';

/**
 * 建立空的離線資料結構
 */
function createEmptyData(): OfflineData {
  return {
    rooms: {},
    students: {},
    items: {},
    submissions: {},
    syncQueue: [],
  };
}

/**
 * 取得離線資料
 */
export function getOfflineData(): OfflineData {
  if (typeof window === 'undefined') {
    return createEmptyData();
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : createEmptyData();
  } catch (error) {
    console.error('Failed to read offline data:', error);
    return createEmptyData();
  }
}

/**
 * 儲存離線資料
 */
export function saveOfflineData(data: OfflineData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save offline data:', error);
  }
}

/**
 * 儲存房間資料
 */
export function saveRoom(
  roomId: string,
  roomData: { id: string; code: string; name: string }
): void {
  const data = getOfflineData();
  data.rooms[roomId] = {
    ...roomData,
    joinedAt: new Date().toISOString(),
  };
  saveOfflineData(data);
}

/**
 * 取得房間資料
 */
export function getRoom(roomId: string) {
  const data = getOfflineData();
  return data.rooms[roomId] || null;
}

/**
 * 儲存學生列表
 */
export function saveStudents(roomId: string, students: Student[]): void {
  const data = getOfflineData();
  data.students[roomId] = students;
  saveOfflineData(data);
}

/**
 * 取得學生列表
 */
export function getStudents(roomId: string): Student[] {
  const data = getOfflineData();
  return data.students[roomId] || [];
}

/**
 * 儲存項目列表
 */
export function saveItems(roomId: string, items: Item[]): void {
  const data = getOfflineData();
  data.items[roomId] = items;
  saveOfflineData(data);
}

/**
 * 取得項目列表
 */
export function getItems(roomId: string): Item[] {
  const data = getOfflineData();
  return data.items[roomId] || [];
}

/**
 * 儲存繳交狀態
 */
export function saveSubmission(
  itemId: string,
  studentId: string,
  status: SubmissionStatus,
  synced: boolean = false
): void {
  const data = getOfflineData();
  if (!data.submissions[itemId]) {
    data.submissions[itemId] = {};
  }
  data.submissions[itemId][studentId] = {
    status,
    updatedAt: new Date().toISOString(),
    synced,
  };
  saveOfflineData(data);
}

/**
 * 取得項目的所有繳交狀態
 */
export function getSubmissions(itemId: string) {
  const data = getOfflineData();
  return data.submissions[itemId] || {};
}

/**
 * 標記繳交狀態為已同步
 */
export function markSubmissionSynced(itemId: string, studentId: string): void {
  const data = getOfflineData();
  if (data.submissions[itemId]?.[studentId]) {
    data.submissions[itemId][studentId].synced = true;
    saveOfflineData(data);
  }
}

/**
 * 取得所有未同步的繳交記錄
 */
export function getUnsyncedSubmissions(): Array<{
  itemId: string;
  studentId: string;
  status: SubmissionStatus;
  updatedAt: string;
}> {
  const data = getOfflineData();
  const unsynced: Array<{
    itemId: string;
    studentId: string;
    status: SubmissionStatus;
    updatedAt: string;
  }> = [];

  Object.entries(data.submissions).forEach(([itemId, students]) => {
    Object.entries(students).forEach(([studentId, submission]) => {
      if (!submission.synced) {
        unsynced.push({
          itemId,
          studentId,
          status: submission.status,
          updatedAt: submission.updatedAt,
        });
      }
    });
  });

  return unsynced;
}

/**
 * 清除特定房間的離線資料
 */
export function clearRoomData(roomId: string): void {
  const data = getOfflineData();
  delete data.rooms[roomId];
  delete data.students[roomId];
  delete data.items[roomId];
  saveOfflineData(data);
}

/**
 * 清除所有離線資料
 */
export function clearAllOfflineData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

