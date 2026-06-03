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

// ===== 反應式訂閱層 =====
// localStorage 是離線資料的單一真相，但它本身沒有訂閱機制。這裡維護一份
// 與 localStorage 同步的記憶體快照（cache）與訂閱者集合，讓 React 元件可透過
// useSyncExternalStore 即時得知任何寫入（saveX / queueRecordUpdate / processSyncQueue）。
// 每次寫入都會替換 cache 參照並通知訂閱者；getSnapshot 回傳穩定的 cache 參照，
// 在無寫入時參照不變，符合 useSyncExternalStore 的快取要求。

let cache: OfflineData | null = null;
const listeners = new Set<() => void>();

// SSR / 首次水合用的固定空快照（getServerSnapshot 必須每次回傳同一參照）
const SERVER_SNAPSHOT: OfflineData = createEmptyData();

function readFromStorage(): OfflineData {
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

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

/**
 * 訂閱離線資料變化（給 useSyncExternalStore 使用）
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 取得目前快照（穩定參照，僅在寫入後改變）。給 useSyncExternalStore 使用。
 */
export function getSnapshot(): OfflineData {
  if (cache === null) {
    cache = readFromStorage();
  }
  return cache;
}

/**
 * SSR / 首次水合用的快照。
 */
export function getServerSnapshot(): OfflineData {
  return SERVER_SNAPSHOT;
}

// 跨分頁同步：其他分頁寫入 localStorage 時更新本分頁快取並通知訂閱者。
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      cache = readFromStorage();
      emitChange();
    }
  });
}

/**
 * 取得離線資料（每次回傳可安全就地修改的新副本，供寫入流程使用）
 */
export function getOfflineData(): OfflineData {
  return readFromStorage();
}

/**
 * 儲存離線資料：寫入 localStorage 後更新記憶體快照並通知訂閱者。
 * 由於所有寫入函式（saveX / queueRecordUpdate / processSyncQueue）最終都會
 * 呼叫此函式，訂閱者因此能對任何離線資料變動即時反應。
 */
export function saveOfflineData(data: OfflineData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save offline data:', error);
    return;
  }

  // 採用剛寫入的物件作為新快照（每次寫入皆為新參照 → 觸發重新渲染）
  cache = data;
  emitChange();
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
 * 寫入 / 更新單一任務到本機快取（依 id 取代，否則新增）。
 * 用於登記頁取得伺服器最新單筆任務、或標記完成後更新狀態。
 */
export function saveTask(roomId: string, task: Task): void {
  const data = getOfflineData();
  const list = data.tasks[roomId] ?? [];
  const index = list.findIndex((t) => t.id === task.id);
  if (index >= 0) {
    list[index] = task;
  } else {
    list.push(task);
  }
  data.tasks[roomId] = list;
  saveOfflineData(data);
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
