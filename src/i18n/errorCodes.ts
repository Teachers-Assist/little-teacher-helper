// API 錯誤碼的單一真實來源（server route 與 client 共用）。API route 回傳碼，
// client 在顯示時透過 resolveError() 翻成文字。每個值都是 message 字典中的點分
// 路徑，因此解析就是單純的查表，不需要再維護第二張對照表。
export const ERROR_CODES = {
  // 通用的 catch-all（非預期的 500）
  INTERNAL_ERROR: 'common.error',

  // 加入班級流程
  ROOM_NOT_FOUND: 'join.roomNotFound',

  // 單筆學生
  STUDENT_NAME_REQUIRED: 'student.nameRequired',
  STUDENT_NAME_TOO_LONG: 'student.nameTooLong',
  STUDENT_SEAT_REQUIRED: 'student.seatRequired',
  STUDENT_SEAT_DUPLICATE: 'student.seatDuplicate',
  // 座號被「已移除」的學生佔用。座號的 unique 約束涵蓋已移除學生（座號同時是小老師
  // 的身份，重用會讓歷史經手記錄無法歸屬），老師在名單上看不到那筆資料，因此必須與
  // 「與現有學生重複」分開講，並點名是誰佔用。文案為函式，需搭配 params。
  STUDENT_SEAT_DUPLICATE_REMOVED: 'student.seatDuplicateRemoved',
  STUDENT_CREATE_FAILED: 'student.createFailed',

  // 批次學生
  STUDENT_BATCH_EMPTY: 'student.batchEmpty',
  STUDENT_BATCH_TOO_MANY: 'student.batchTooMany',
  STUDENT_SEAT_DUPLICATE_IN_LIST: 'student.seatDuplicateInList',
  STUDENT_SEAT_DUPLICATE_EXISTING: 'student.seatDuplicateExisting',
  STUDENT_BATCH_FAILED: 'student.batchFailed',

  // 同步 / 登記衝突（004 US1；供 client 分類可重試 / 不可重試，見 FR-078）
  // 以下皆為「不可重試」：任務鎖定、任務不存在、學生已移除、資料驗證失敗——
  // 重送也不會成功，client 應停止重試並進入告知流程。
  TASK_LOCKED: 'sync.taskLocked',
  TASK_NOT_FOUND: 'sync.taskNotFound',
  STUDENT_NOT_IN_ROOM: 'sync.studentRemoved',
  RECORD_VALIDATION_FAILED: 'record.saveFailed',
} as const;

/**
 * 不可重試的錯誤碼集合（004 FR-078）：這些成因重送也不會成功，
 * client 端 MUST 停止重試、直接進入告知流程。其餘（如網路層失敗）視為可重試。
 * 分類 MUST 依碼值判斷，MUST NOT 以錯誤訊息的中文文字比對。
 */
export const NON_RETRYABLE_ERROR_CODES: ReadonlySet<ErrorCode> = new Set([
  ERROR_CODES.TASK_LOCKED,
  ERROR_CODES.TASK_NOT_FOUND,
  ERROR_CODES.STUDENT_NOT_IN_ROOM,
  ERROR_CODES.RECORD_VALIDATION_FAILED,
]);

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** 帶參數的錯誤文案所需的替換值（如 STUDENT_SEAT_DUPLICATE_REMOVED）。 */
export interface SeatHolderParams {
  seatNumber: number;
  name: string;
}

/** API route 回傳的標準 JSON 錯誤格式。 */
export interface ApiError {
  error: ErrorCode;
  /** 文案為函式時的替換值，由 resolveError() 帶入。 */
  params?: SeatHolderParams;
}
