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
  isActive: boolean;
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
  isActive?: boolean;
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
  records: {
    [taskId: string]: {
      [studentId: string]: {
        submissionStatus?: SubmissionStatus;
        gradeValue?: number;
        recorderSeatNumber: number;
        isAssignedRecorder: boolean;
        updatedAt: string;
        synced: boolean;
      };
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
