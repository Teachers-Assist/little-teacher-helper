// 基於 data-model.md 的型別定義

// ===== Enums (SQLite 以 String 儲存，TS 層做型別約束) =====
export enum TaskType {
  SUBMISSION = 'SUBMISSION', // 繳交與否
  GRADE = 'GRADE', // 成績數值
}

export enum TaskStatus {
  ACTIVE = 'ACTIVE', // 開放登記中
  HELPER_COMPLETED = 'HELPER_COMPLETED', // 小老師已標記完成，鎖定中
  CLOSED = 'CLOSED', // 老師已結案
}

export enum SubmissionStatus {
  SUBMITTED = 'SUBMITTED',
  NOT_SUBMITTED = 'NOT_SUBMITTED',
}

// ===== Teacher =====
export interface Teacher {
  id: string;
  name: string;
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeacherInput {
  name: string;
  email?: string;
}

// ===== Room =====
export interface Room {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomWithDetails extends Room {
  teacher?: Teacher;
  studentCount?: number;
  taskCount?: number;
  _count?: {
    students: number;
    tasks: number;
  };
}

export interface CreateRoomInput {
  name: string;
  teacherId: string;
}

export interface UpdateRoomInput {
  name?: string;
}

// ===== Student =====
export interface Student {
  id: string;
  name: string;
  seatNumber: number;
  roomId: string;
  isRemoved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentInput {
  name: string;
  seatNumber: number;
}

export interface BatchCreateStudentsInput {
  students: CreateStudentInput[];
}

export interface UpdateStudentInput {
  name?: string;
  seatNumber?: number;
}

// ===== Task =====
export interface Task {
  id: string;
  name: string;
  type: TaskType;
  roomId: string;
  assignedSeatNumber?: number | null;
  dueDate?: Date | null;
  status: TaskStatus;
  isArchived: boolean;
  archivedAt?: Date | string | null; // 最近一次封存時間（004 FR-097a）
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithStats extends Task {
  recordedCount?: number;
  totalCount?: number;
  // 繳交類型統計
  submittedCount?: number;
  notSubmittedCount?: number;
}

export interface CreateTaskInput {
  name: string;
  type: TaskType;
  assignedSeatNumber?: number;
  dueDate?: Date;
}

export interface UpdateTaskInput {
  name?: string;
  assignedSeatNumber?: number | null;
  dueDate?: Date | null;
  status?: TaskStatus;
}

// ===== Record (登記記錄) =====
export interface Record {
  id: string;
  taskId: string;
  studentId: string;
  submissionStatus?: SubmissionStatus | null;
  gradeValue?: number | null;
  recorderSeatNumber: number;
  isAssignedRecorder: boolean;
  syncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordWithStudent extends Record {
  student: Student;
}

/**
 * 一筆 Record 的順序處理者名單項（004 US4，監視器留痕）。
 * 依 handledAt 排序：第一筆＝最初建立者、最後一筆＝最後修改者（＝ Record.recorderSeatNumber）。
 */
export interface RecordHandler {
  id: string;
  recordId: string;
  seatNumber: number;
  handledAt: Date;
}

/**
 * 登記一筆記錄的輸入。
 * SUBMISSION 類型填 submissionStatus；GRADE 類型填 gradeValue。
 * isAssignedRecorder 由伺服器端依 task.assignedSeatNumber 計算，不由前端帶入。
 */
export interface UpdateRecordInput {
  taskId: string;
  studentId: string;
  submissionStatus?: SubmissionStatus;
  gradeValue?: number;
  recorderSeatNumber: number;
}

export interface BatchUpdateRecordsInput {
  records: UpdateRecordInput[];
}

// ===== Sync =====
export interface SyncOperation {
  id: string;
  type: 'UPDATE_RECORD';
  payload: UpdateRecordInput;
  timestamp: string;
}

export interface SyncRequest {
  deviceId?: string;
  operations: SyncOperation[];
}

export interface SyncResponse {
  synced: number;
  operationIds: string[];
}

// ===== Report =====
export interface Report {
  task: Task;
  roomName: string;
  summary: {
    total: number;
    recorded: number;
    // 繳交類型
    submitted: number;
    notSubmitted: number;
    submissionRate: number;
  };
  records: RecordWithStudent[];
  // 繳交類型用
  submittedStudents: Student[];
  notSubmittedStudents: Student[];
}

// ===== Join =====
export interface RoomJoinResponse {
  room: {
    id: string;
    name: string;
    code: string;
  };
  students: Student[];
  tasks: Task[];
}

// ===== Offline Data Structure =====

/**
 * 一筆登記記錄在本機的快取內容。
 *
 * 注意「被登記的學生」不在此型別內——它是 OfflineData.records 的巢狀 key
 * （`records[taskId][studentId]`，studentId 對應 Student.id），可在 students
 * 快取中查到該生姓名與座號。
 * 本型別的 recorderSeatNumber 是「執行登記的小老師座號」，與被登記學生是不同身分。
 */
export interface OfflineRecordEntry {
  submissionStatus?: SubmissionStatus; // 繳交類型；只會是 SUBMITTED
  gradeValue?: number; // 成績類型
  recorderSeatNumber: number; // 登記者（小老師）座號，非被登記學生
  isAssignedRecorder: boolean; // 登記者是否為任務指定的小老師
  updatedAt: string;
  // 「是否已同步」不再存於此——改由「該 (taskId, studentId) 是否還在 syncQueue」派生
  // （overlay 模型：佇列是未同步狀態的單一真相）。見 overlay.ts / store.ts。
}

export interface OfflineData {
  rooms: {
    [roomId: string]: {
      id: string;
      code: string;
      name: string;
      joinedAt: string;
      seatNumber: number; // 本次選擇的座號
    };
  };
  students: {
    [roomId: string]: Student[];
  };
  tasks: {
    [roomId: string]: Task[];
  };
  // key 結構：records[taskId][studentId]，studentId 即被登記學生的 Student.id
  records: {
    [taskId: string]: {
      [studentId: string]: OfflineRecordEntry;
    };
  };
  syncQueue: OfflineSyncQueueItem[];
}

export interface OfflineSyncQueueItem {
  id: string;
  type: 'UPDATE_RECORD';
  payload: UpdateRecordInput;
  createdAt: string;
  retryCount: number;
  // 樂觀並行控制版本戳（004 S9）：新建 op = 0；去重就地換 payload 時 +1。
  // processSyncQueue 送出前記下 sentRev，回應到達時只 ack「rev 未變」者（S10），
  // 避免飛行期間被改的新值被舊回應誤 ack 而蒸發（remediation 臉 A）。
  rev: number;
  // 不可重試標記（004 S10）：同步回傳不可重試衝突（任務鎖定 / 不存在 / 學生已移除 /
  // 驗證失敗）時設為 true，不再送出、但**保留於佇列**（INV-1 不靜默移除）。
  // 屬 session 範圍的重試判定，MUST 於頁面載入時重置（S11 / FR-079 / NFR-013）。
  nonRetryable?: boolean;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
