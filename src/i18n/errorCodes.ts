// API 錯誤碼的單一真實來源（server route 與 client 共用）。API route 回傳碼，
// client 在顯示時透過 resolveError() 翻成文字。每個值都是 message 字典中的點分
// 路徑，因此解析就是單純的查表，不需要再維護第二張對照表。
export const ERROR_CODES = {
  // 通用的 catch-all（非預期的 500）
  INTERNAL_ERROR: 'common.error',

  // 加入班級流程
  ROOM_NOT_FOUND: 'join.roomNotFound',
  ROOM_INACTIVE: 'join.roomInactive',

  // 單筆學生
  STUDENT_NAME_REQUIRED: 'student.nameRequired',
  STUDENT_NAME_TOO_LONG: 'student.nameTooLong',
  STUDENT_SEAT_REQUIRED: 'student.seatRequired',
  STUDENT_SEAT_DUPLICATE: 'student.seatDuplicate',
  STUDENT_CREATE_FAILED: 'student.createFailed',

  // 批次學生
  STUDENT_BATCH_EMPTY: 'student.batchEmpty',
  STUDENT_BATCH_TOO_MANY: 'student.batchTooMany',
  STUDENT_SEAT_DUPLICATE_IN_LIST: 'student.seatDuplicateInList',
  STUDENT_SEAT_DUPLICATE_EXISTING: 'student.seatDuplicateExisting',
  STUDENT_BATCH_FAILED: 'student.batchFailed',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** API route 回傳的標準 JSON 錯誤格式。 */
export interface ApiError {
  error: ErrorCode;
}
