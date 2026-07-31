// 登記寫入 + 順序處理者名單維護（004 US4）。/api/records 與 /api/sync 共用，
// 確保兩條寫入路徑的留痕行為一致。

import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { record, recordHandler } from '@/db/schema';
import { SubmissionStatus } from '@/types';
import { shouldAppendHandler } from '@/lib/recordHandlerRule';

// 追加規則已抽至無伺服器相依的純模組，供 demo 沙盒共用；此處 re-export 維持既有匯入點。
export { shouldAppendHandler };

/**
 * 刪除某 (taskId, studentId) 的登記記錄及其順序處理者名單（取消勾選 / 清空成績用）。
 *
 * 明確先刪 handlers 再刪 record，不依賴資料庫端 FK cascade 是否啟用（D1 / libsql 的
 * foreign_keys pragma 行為不一）。(taskId, studentId) 唯一，故至多一筆 record。
 */
export async function deleteRecordByTaskStudent(taskId: string, studentId: string): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ id: record.id })
    .from(record)
    .where(and(eq(record.taskId, taskId), eq(record.studentId, studentId)));
  if (rows.length === 0) return;
  const ids = rows.map((r) => r.id);
  await db.delete(recordHandler).where(inArray(recordHandler.recordId, ids));
  await db.delete(record).where(inArray(record.id, ids));
}

/**
 * upsert 一筆 Record，並依規則維護其順序處理者名單（RecordHandler）。
 *
 * D1 不支援互動式 transaction（begin/commit 跨多次 await），故為循序操作：
 * 先讀名單最後一筆座號 → upsert 紀錄（onConflictDoUpdate，靠 (taskId, studentId) 唯一約束
 * 保證同筆登記不會重複建立）→ 若本次座號與名單最後一筆不同則追加一筆 handler。
 * 名單追加為附屬寫入，單機低併發下風險可接受（不再具備嚴格原子性）。
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

  // 名單最後一筆座號（透過 recordId join 回 (taskId, studentId)；記錄不存在時為空）
  const lastHandler = await db
    .select({ seatNumber: recordHandler.seatNumber })
    .from(recordHandler)
    .innerJoin(record, eq(recordHandler.recordId, record.id))
    .where(and(eq(record.taskId, taskId), eq(record.studentId, studentId)))
    .orderBy(desc(recordHandler.handledAt))
    .limit(1);
  const lastSeat = lastHandler[0]?.seatNumber ?? null;

  const upserted = await db
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
    })
    .returning({ id: record.id });

  const recordId = upserted[0].id;

  if (shouldAppendHandler(lastSeat, recorderSeatNumber)) {
    await db.insert(recordHandler).values({ recordId, seatNumber: recorderSeatNumber, handledAt });
  }
}
