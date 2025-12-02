// 基於 data-model.md 的型別定義

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
  itemCount?: number;
  _count?: {
    students: number;
    items: number;
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
  seatNumber?: number | null;
  roomId: string;
  isRemoved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentInput {
  name: string;
  seatNumber?: number;
}

export interface BatchCreateStudentsInput {
  students: CreateStudentInput[];
}

export interface UpdateStudentInput {
  name?: string;
  seatNumber?: number;
}

// ===== Item =====
export interface Item {
  id: string;
  name: string;
  roomId: string;
  dueDate?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemWithStats extends Item {
  submittedCount?: number;
  notSubmittedCount?: number;
  totalCount?: number;
}

export interface CreateItemInput {
  name: string;
  dueDate?: Date;
}

export interface UpdateItemInput {
  name?: string;
  dueDate?: Date;
  isActive?: boolean;
}

// ===== Submission =====
export interface Submission {
  id: string;
  studentId: string;
  itemId: string;
  status: SubmissionStatus;
  updatedBy?: string | null;
  syncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionWithStudent extends Submission {
  student: Student;
}

export interface UpdateSubmissionInput {
  studentId: string;
  itemId: string;
  status: SubmissionStatus;
}

export interface BatchUpdateSubmissionsInput {
  submissions: UpdateSubmissionInput[];
}

// ===== Sync =====
export interface SyncOperation {
  id: string;
  type: 'UPDATE_SUBMISSION';
  payload: UpdateSubmissionInput;
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
  item: Item;
  summary: {
    total: number;
    submitted: number;
    notSubmitted: number;
    submissionRate: number;
  };
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
  items: Item[];
}

// ===== Offline Data Structure =====
export interface OfflineData {
  rooms: {
    [roomId: string]: {
      id: string;
      code: string;
      name: string;
      joinedAt: string;
    };
  };
  students: {
    [roomId: string]: Student[];
  };
  items: {
    [roomId: string]: Item[];
  };
  submissions: {
    [itemId: string]: {
      [studentId: string]: {
        status: SubmissionStatus;
        updatedAt: string;
        synced: boolean;
      };
    };
  };
  syncQueue: OfflineSyncQueueItem[];
}

export interface OfflineSyncQueueItem {
  id: string;
  type: 'UPDATE_SUBMISSION';
  payload: UpdateSubmissionInput;
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

