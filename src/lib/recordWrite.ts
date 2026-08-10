// 登記寫入 + 順序處理者名單維護（004 US4）。/api/records 與 /api/sync 共用，
// 確保兩條寫入路徑的留痕行為一致。

import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { record, recordHandler } from '@/db/schema';
import { SubmissionStatus } from '@/types';
import { shouldAppendHandler, type HandlerAction, type HandlerStep } from '@/lib/recordHandlerRule';

// 追加規則已抽至無伺服器相依的純模組，供 demo 沙盒共用；此處 re-export 維持既有匯入點。
export { shouldAppendHandler };

/**
 * 讀出某格經手鏈的最後一手（不存在時為 null）。
 * 鏈以 (taskId, studentId) 為 key，故不需 join Record——鏈可以在該格無登記時仍存在。
 */
async function getLastHandler(taskId: string, studentId: string): Promise<HandlerStep | null> {
  const db = await getDb();
  const rows = await db
    .select({ seatNumber: recordHandler.seatNumber, action: recordHandler.action })
    .from(recordHandler)
    .where(and(eq(recordHandler.taskId, taskId), eq(recordHandler.studentId, studentId)))
    .orderBy(desc(recordHandler.handledAt))
    .limit(1);
  const last = rows[0];
  return last ? { seatNumber: last.seatNumber, action: last.action as HandlerAction } : null;
}

/** 依規則決定要不要追加一手，需要才寫入。 */
async function appendHandlerIfNeeded(params: {
  taskId: string;
  studentId: string;
  seatNumber: number;
  action: HandlerAction;
  handledAt: Date;
}): Promise<void> {
  const { taskId, studentId, seatNumber, action, handledAt } = params;
  const last = await getLastHandler(taskId, studentId);
  if (!shouldAppendHandler(last, { seatNumber, action })) return;
  const db = await getDb();
  await db.insert(recordHandler).values({ taskId, studentId, seatNumber, action, handledAt });
}

/**
 * 刪除某 (taskId, studentId) 的登記記錄（取消勾選 / 清空成績用），並把這次刪除**記為一手**。
 *
 * MUST NOT 一併刪除經手鏈（FR-093a）：清掉別人登的資料正是老師最需要看見的經手，
 * 抹掉鏈等於湮滅證據。鏈以 (taskId, studentId) 為 key，本來就不隨 record 消失。
 *
 * 明確只刪 record，不依賴資料庫端 FK cascade 是否啟用（D1 / libsql 的 foreign_keys
 * pragma 行為不一）。(taskId, studentId) 唯一，故至多一筆 record。
 */
export async function deleteRecordByTaskStudent(params: {
  taskId: string;
  studentId: string;
  recorderSeatNumber: number;
  /** 該次處理時間；離線同步傳操作原始時間，線上省略則用 now。 */
  handledAt?: Date;
}): Promise<void> {
  const { taskId, studentId, recorderSeatNumber } = params;
  const handledAt = params.handledAt ?? new Date();
  const db = await getDb();

  await db.delete(record).where(and(eq(record.taskId, taskId), eq(record.studentId, studentId)));

  await appendHandlerIfNeeded({
    taskId,
    studentId,
    seatNumber: recorderSeatNumber,
    action: 'DELETE',
    handledAt,
  });
}

/**
 * upsert 一筆 Record，並依規則維護其順序處理者名單（RecordHandler）。
 *
 * D1 不支援互動式 transaction（begin/commit 跨多次 await），故為循序操作：
 * upsert 紀錄（onConflictDoUpdate，靠 (taskId, studentId) 唯一約束保證同筆登記不會重複
 * 建立）→ 讀鏈末筆 → 依規則決定是否追加。名單追加為附屬寫入，單機低併發下風險可接受
 * （不具備嚴格原子性）。
 * handledAt 決定名單順序——離線同步時傳入該次操作的原始時間（op.timestamp），
 * 使離線經手鏈依正確順序併入（FR-097）。
 */
export async function writeRecordWithHandler(params: {
  taskId: string;
  studentId: string;
  submissionStatus?: SubmissionStatus | null;
  gradeValue?: number | null;
  recorderSeatNumber: number;
  isAssignedRecorder: boolean;
  /** 該次處理時間；離線同步傳操作原始時間，線上省略則用 now。 */
  handledAt?: Date;
}): Promise<void> {
  const {
    taskId,
    studentId,
    submissionStatus = null,
    gradeValue = null,
    recorderSeatNumber,
    isAssignedRecorder,
  } = params;
  const handledAt = params.handledAt ?? new Date();
  const db = await getDb();

  await db
    .insert(record)
    .values({
      taskId,
      studentId,
      submissionStatus,
      gradeValue,
      recorderSeatNumber,
      isAssignedRecorder,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [record.taskId, record.studentId],
      set: { submissionStatus, gradeValue, recorderSeatNumber, isAssignedRecorder, syncedAt: new Date() },
    });

  await appendHandlerIfNeeded({
    taskId,
    studentId,
    seatNumber: recorderSeatNumber,
    action: 'RECORD',
    handledAt,
  });
}
