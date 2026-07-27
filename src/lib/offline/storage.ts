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
export function saveOfflineData(data: OfflineData): boolean {
  if (typeof window === 'undefined') return true;

  let ok = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // localStorage 寫入失敗（無痕模式 / 配額爆掉）：MUST NOT 只 console.error 後吞掉（FR-089）。
    // 回傳失敗訊號供上層告知使用者（FR-090）；但仍更新記憶體快照並通知，讓操作在畫面上照常
    // 發生、不阻擋（FR-091）——只是這次無法持久化，重整後會遺失。
    console.error('Failed to save offline data:', error);
    ok = false;
  }

  // 採用剛寫入的物件作為新快照（每次寫入皆為新參照 → 觸發重新渲染）
  cache = data;
  emitChange();
  return ok;
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
 * 找出本機已加入（選過座號）且 code 相符的房間，不存在時為 null。
 *
 * 用於防止「回上一頁重選座號」：/join/[code] 若偵測到此房間已加入（例：從 /helper 按上一頁
 * 回來），一律視同「換座號 / 重新進入」——清掉房間快取後退回 /join，不在此就地重選座號。
 */
export function getJoinedRoomByCode(code: string) {
  const data = getOfflineData();
  const upper = code.toUpperCase();
  return (
    Object.values(data.rooms).find((r) => r.code?.toUpperCase() === upper && r.seatNumber != null) ??
    null
  );
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
 * 清掉「孤兒」登記快取：某 taskId 的記錄，若該任務已不在任何本機房間的任務清單中
 * （老師刪除任務、或換／離開房間後其任務清單被移除），且**沒有任何待同步操作指向它**，
 * 即整包移除——這些是純鏡像、連線後可重新取回的已同步資料（P2-1，止住 records 只增不減）。
 *
 * 安全不變式：只要該 taskId 尚有待送 op（syncQueue 內），一律保留——未送出的登記是不可逆
 * 資料，不可因清理而遺失（守 vision 原則一 / NFR-013）。
 *
 * 刻意只做**任務層級**：不因學生被移除而刪其記錄——移除須維持可還原（002 FR-025/026、
 * 004 Edge Cases「計算層排除、不刪資料」），故移除學生的記錄由計算層排除、實體不刪。
 */
function pruneSyncedOrphanRecords(data: OfflineData): void {
  const knownTaskIds = new Set<string>();
  for (const roomId of Object.keys(data.tasks)) {
    for (const task of data.tasks[roomId]) knownTaskIds.add(task.id);
  }
  const queuedTaskIds = new Set(data.syncQueue.map((op) => op.payload.taskId));
  for (const taskId of Object.keys(data.records)) {
    if (!knownTaskIds.has(taskId) && !queuedTaskIds.has(taskId)) {
      delete data.records[taskId];
    }
  }
}

/**
 * 儲存任務列表。任務清單是「哪些任務還存在」的最新事實，故在此順道清掉孤兒登記快取（P2-1）。
 */
export function saveTasks(roomId: string, tasks: Task[]): void {
  const data = getOfflineData();
  data.tasks[roomId] = tasks;
  pruneSyncedOrphanRecords(data);
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
    };
  });
  data.records[taskId] = map;
  saveOfflineData(data);
}

/**
 * 換座號用：清掉「身份 / 名單 / 任務」本機快取，讓使用者重新從 /join 入場
 * （003 US4 / FR-075）。
 *
 * 刻意**保留未同步的登記與 syncQueue** —— 未送出的登記是不可逆資料，不可因換座號而遺失
 * （守 vision.md「不可逆操作不破壞資料」原則）。未送出的登記仍掛在佇列裡，連線後照常
 * 上傳，且保留原 recorderSeatNumber（問責不丟）。同一台裝置換座號後可繼續累積登記；
 * 對同一 task+student 再次登記則沿用既有去重邏輯更新該筆，不覆蓋他人尚未上傳的登記。
 *
 * 房間任務清單被移除後，其**已同步且無待送 op** 的登記快取即成孤兒，順道清掉（P2-1）；
 * 有待送 op 者由 pruneSyncedOrphanRecords 的不變式保留，不受影響。
 */
export function clearRoom(roomId: string): void {
  const data = getOfflineData();
  delete data.rooms[roomId];
  delete data.students[roomId];
  delete data.tasks[roomId];
  pruneSyncedOrphanRecords(data);
  saveOfflineData(data);
}
