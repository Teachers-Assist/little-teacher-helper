import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { student, task } from '@/db/schema';
import { computeIsAssignedRecorder, getTaskLockReason, resolveRecordMutation } from '@/lib/task';
import { ERROR_CODES, type ErrorCode } from '@/i18n/errorCodes';
import { deleteRecordByTaskStudent, writeRecordWithHandler } from '@/lib/recordWrite';

interface SyncOperation {
  id: string;
  type: 'UPDATE_RECORD';
  payload: {
    taskId: string;
    studentId: string;
    submissionStatus?: 'SUBMITTED' | 'NOT_SUBMITTED';
    gradeValue?: number;
    recorderSeatNumber: number;
  };
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { operations } = body as {
      deviceId?: string;
      operations: SyncOperation[];
    };

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      // 請求本身格式錯誤（client bug，不會逐筆呈現給學生）→ 通用碼
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 400 });
    }

    // 一次撈出涉及任務，供類型驗證與鎖定判斷
    const taskIds = [...new Set(operations.map((op) => op.payload?.taskId).filter(Boolean))];
    const tasks = taskIds.length
      ? await db.select().from(task).where(inArray(task.id, taskIds))
      : [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    // 涉及班級的「在籍座號」集合，供辨識「登記者（小老師）座號已被老師移除」（AS8）。
    // 封存任務不在此擋——沿用 FR-101a：封存後離線登記照常寫入、由學生端告知「已收起」。
    const roomIds = [...new Set(tasks.map((t) => t.roomId))];
    const activeStudents = roomIds.length
      ? await db
          .select({ roomId: student.roomId, seatNumber: student.seatNumber })
          .from(student)
          .where(and(inArray(student.roomId, roomIds), eq(student.isRemoved, false)))
      : [];
    const activeSeatSet = new Set(activeStudents.map((s) => `${s.roomId}:${s.seatNumber}`));

    const syncedIds: string[] = [];
    // reason 一律為 ERROR_CODES 碼值（FR-112），供 client 依碼分類可重試 / 不可重試（FR-078），
    // MUST NOT 回硬編中文。
    const conflicts: Array<{ operationId: string; reason: ErrorCode }> = [];

    for (const operation of operations) {
      if (operation.type !== 'UPDATE_RECORD') {
        // 不支援的操作類型：資料問題，重送也不會過 → 不可重試
        conflicts.push({ operationId: operation.id, reason: ERROR_CODES.RECORD_VALIDATION_FAILED });
        continue;
      }

      const { taskId, studentId, recorderSeatNumber } = operation.payload;
      const task = taskMap.get(taskId);

      if (!task) {
        conflicts.push({ operationId: operation.id, reason: ERROR_CODES.TASK_NOT_FOUND });
        continue;
      }
      // 登記者座號已不屬於任何在籍學生（老師移除了該小老師）→ 不可重試，讓學生看見（AS8）
      if (!activeSeatSet.has(`${task.roomId}:${recorderSeatNumber}`)) {
        conflicts.push({ operationId: operation.id, reason: ERROR_CODES.STUDENT_NOT_IN_ROOM });
        continue;
      }
      if (getTaskLockReason(task) !== null) {
        conflicts.push({ operationId: operation.id, reason: ERROR_CODES.TASK_LOCKED });
        continue;
      }

      const mutation = resolveRecordMutation(task.type, operation.payload);
      if (!mutation.ok) {
        conflicts.push({ operationId: operation.id, reason: ERROR_CODES.RECORD_VALIDATION_FAILED });
        continue;
      }

      try {
        if (mutation.action === 'delete') {
          // 取消勾選 / 清空成績 → 刪除記錄
          await deleteRecordByTaskStudent(taskId, studentId);
          syncedIds.push(operation.id);
          continue;
        }

        const isAssignedRecorder = computeIsAssignedRecorder(
          task.assignedSeatNumber,
          recorderSeatNumber
        );

        // 寫入紀錄並維護順序處理者名單（US4）。handledAt 用操作原始時間，使離線經手鏈
        // 依正確順序併入（FR-097）；timestamp 無效時退回 now。
        const handledAt = operation.timestamp ? new Date(operation.timestamp) : new Date();
        await writeRecordWithHandler({
          taskId,
          studentId,
          submissionStatus: mutation.data.submissionStatus,
          gradeValue: mutation.data.gradeValue,
          recorderSeatNumber,
          isAssignedRecorder,
          handledAt: isNaN(handledAt.getTime()) ? new Date() : handledAt,
        });

        syncedIds.push(operation.id);
      } catch (error) {
        // DB 寫入等暫時性失敗：可重試 → 通用碼（不在 NON_RETRYABLE 集合內）
        console.error('Failed to sync operation:', operation.id, error);
        conflicts.push({ operationId: operation.id, reason: ERROR_CODES.INTERNAL_ERROR });
      }
    }

    if (conflicts.length > 0 && syncedIds.length > 0) {
      return NextResponse.json(
        { synced: syncedIds.length, operationIds: syncedIds, conflicts },
        { status: 207 }
      );
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        { synced: 0, operationIds: [], conflicts },
        { status: 409 }
      );
    }

    return NextResponse.json({ synced: syncedIds.length, operationIds: syncedIds });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}
