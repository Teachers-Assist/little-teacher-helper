// 登記寫入 + 順序處理者名單維護（004 US4）。/api/records 與 /api/sync 共用，
// 確保兩條寫入路徑的留痕行為一致。

import { getDb } from '@/lib/db';
import { SubmissionStatus } from '@/types';

/**
 * 是否該把這次處理追加到名單（FR-093）：只有「與名單最後一筆座號不同」才追加，
 * 避免同一座號連續修正把名單灌爆。被其他座號穿插後的同座號再次修改仍各自記錄
 * （例：8 → 12 → 8 保留三筆；8 → 8 → 8 只留一筆）。純函式，供測試。
 */
export function shouldAppendHandler(lastSeat: number | null | undefined, seat: number): boolean {
  return lastSeat !== seat;
}

/**
 * upsert 一筆 Record，並依規則維護其順序處理者名單（RecordHandler）。
 *
 * 在單一 transaction 內：讀既有紀錄（含最後一筆 handler）→ upsert 紀錄 → 若本次座號與
 * 名單最後一筆不同則追加一筆 handler。handledAt 決定名單順序——離線同步時傳入該次操作的
 * 原始時間（op.timestamp），使離線經手鏈依正確順序併入（FR-097）。
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
  const prisma = await getDb();

  // 註：D1 不支援 Prisma 的 interactive transaction（$transaction(async (tx) => ...)），
  // 故改為循序操作。Record 的 (taskId, studentId) 唯一約束保證同筆登記不會重複建立；
  // 名單追加為附屬寫入，單機低併發下風險可接受（不再具備嚴格原子性）。
  const existing = await prisma.record.findUnique({
    where: { taskId_studentId: { taskId, studentId } },
    include: { handlers: { orderBy: { handledAt: 'desc' }, take: 1 } },
  });

  const record = await prisma.record.upsert({
    where: { taskId_studentId: { taskId, studentId } },
    update: { submissionStatus, gradeValue, recorderSeatNumber, isAssignedRecorder, syncedAt: new Date() },
    create: { taskId, studentId, submissionStatus, gradeValue, recorderSeatNumber, isAssignedRecorder, syncedAt: new Date() },
  });

  const lastSeat = existing?.handlers[0]?.seatNumber ?? null;
  if (shouldAppendHandler(lastSeat, recorderSeatNumber)) {
    await prisma.recordHandler.create({
      data: { recordId: record.id, seatNumber: recorderSeatNumber, handledAt },
    });
  }
}
