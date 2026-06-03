import { OfflineData, OfflineRecordEntry, SubmissionStatus, Student, Task } from '@/types';

export type { OfflineRecordEntry };

const STORAGE_KEY = 'little-helper-offline-data';

/**
 * 建立空的離線資料結構
 */
function createEmptyData(): OfflineData {
  return {
    rooms: {},
    students: {},
    tasks: {},
    records: {},
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
 * 儲存房間資料（含本次選擇的座號）
 */
export function saveRoom(
  roomId: string,
  roomData: { id: string; code: string; name: string },
  seatNumber: number
): void {
  const data = getOfflineData();
  data.rooms[roomId] = {
    ...roomData,
    seatNumber,
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
 * 儲存任務列表
 */
export function saveTasks(roomId: string, tasks: Task[]): void {
  const data = getOfflineData();
  data.tasks[roomId] = tasks;
  saveOfflineData(data);
}

/**
 * 取得任務列表
 */
export function getTasks(roomId: string): Task[] {
  const data = getOfflineData();
  return data.tasks[roomId] || [];
}

/**
 * 寫入一筆登記記錄到本機快取（標記為待同步）。
 * 僅用於「有登記」的記錄；取消登記請改用 removeRecord。
 */
export function saveRecord(
  taskId: string,
  studentId: string,
  entry: Omit<OfflineRecordEntry, 'updatedAt' | 'synced'>,
  synced: boolean = false
): void {
  const data = getOfflineData();
  if (!data.records[taskId]) {
    data.records[taskId] = {};
  }
  data.records[taskId][studentId] = {
    ...entry,
    updatedAt: new Date().toISOString(),
    synced,
  };
  saveOfflineData(data);
}

/**
 * 從本機快取移除一筆登記記錄（取消勾選 / 清空成績 → 回到「沒登記過」）。
 */
export function removeRecord(taskId: string, studentId: string): void {
  const data = getOfflineData();
  if (data.records[taskId]?.[studentId]) {
    delete data.records[taskId][studentId];
    saveOfflineData(data);
  }
}

/**
 * 取得某任務在本機的所有登記記錄
 */
export function getRecords(taskId: string): { [studentId: string]: OfflineRecordEntry } {
  const data = getOfflineData();
  return (data.records[taskId] as { [studentId: string]: OfflineRecordEntry }) || {};
}

/**
 * 線上載入時，用伺服器端記錄覆蓋本機該任務的快取，讓離線時也看得到。
 * 線上以伺服器為準（與畫面取值一致）；尚未同步的離線編輯保存在同步佇列中，
 * 連線後送出並反映到伺服器，不靠這份快取保留。
 */
export function cacheSyncedRecords(
  taskId: string,
  records: Array<{
    studentId: string;
    submissionStatus?: SubmissionStatus | null;
    gradeValue?: number | null;
    recorderSeatNumber: number;
    isAssignedRecorder: boolean;
    updatedAt?: string;
  }>
): void {
  const data = getOfflineData();
  const map: { [studentId: string]: OfflineRecordEntry } = {};
  records.forEach((r) => {
    map[r.studentId] = {
      submissionStatus: r.submissionStatus ?? undefined,
      gradeValue: r.gradeValue ?? undefined,
      recorderSeatNumber: r.recorderSeatNumber,
      isAssignedRecorder: r.isAssignedRecorder,
      updatedAt: r.updatedAt ?? new Date().toISOString(),
      synced: true,
    };
  });
  data.records[taskId] = map;
  saveOfflineData(data);
}

// 註：刻意不提供「清除房間 / 清除全部離線資料」函式。
// 依 vision.md「不可逆操作系統硬性防堵」原則，清掉未同步的登記＝不可逆的資料遺失，
// spec 也無此需求。若未來需要「換班級」等清理，必須先確保無待同步資料才可進行。
