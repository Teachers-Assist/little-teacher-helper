import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { record, task } from '@/db/schema';
import { computeIsAssignedRecorder, getTaskLockReason, resolveRecordMutation } from '@/lib/task';
import { ERROR_CODES, type ErrorCode } from '@/i18n/errorCodes';
import { deleteRecordByTaskStudent, writeRecordWithHandler } from '@/lib/recordWrite';

interface RecordInput {
  taskId: string;
  studentId: string;
  submissionStatus?: 'SUBMITTED' | 'NOT_SUBMITTED';
  gradeValue?: number;
  recorderSeatNumber: number;
}

/** 取得某任務的所有登記記錄（含學生資料），依座號排序。 */
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 400 });
    }

    const records = await db.query.record.findMany({
      where: eq(record.taskId, taskId),
      with: {
        student: {
          columns: { id: true, name: true, seatNumber: true, isRemoved: true },
        },
        // US4：順序處理者名單（依時間），供老師端查閱經手鏈
        handlers: {
          columns: { seatNumber: true, handledAt: true },
          orderBy: (h, { asc }) => [asc(h.handledAt)],
        },
      },
    });

    // 依 student.seatNumber、name 排序（關聯欄位無法於 DB 端排序，改於記憶體排序）
    records.sort(
      (a, b) => a.student.seatNumber - b.student.seatNumber || a.student.name.localeCompare(b.student.name)
    );

    return NextResponse.json(records);
  } catch (error) {
    console.error('Failed to fetch records:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}

/** 批次新增/更新登記記錄（含離線同步）。 */
export async function PATCH(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { records } = body as { records: RecordInput[] };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 400 });
    }

    // 一次撈出涉及的任務，供類型驗證與鎖定判斷
    const taskIds = [...new Set(records.map((r) => r.taskId))];
    const tasks = taskIds.length
      ? await db.select().from(task).where(inArray(task.id, taskIds))
      : [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const results: unknown[] = [];
    // reason 一律為 ERROR_CODES 碼值（FR-111/112），MUST NOT 回硬編中文。
    const errors: Array<{ taskId: string; studentId: string; reason: ErrorCode }> = [];

    for (const input of records) {
      const { taskId, studentId, recorderSeatNumber } = input;

      if (!taskId || !studentId || typeof recorderSeatNumber !== 'number') {
        errors.push({ taskId, studentId, reason: ERROR_CODES.RECORD_VALIDATION_FAILED });
        continue;
      }

      const task = taskMap.get(taskId);
      if (!task) {
        errors.push({ taskId, studentId, reason: ERROR_CODES.TASK_NOT_FOUND });
        continue;
      }

      if (getTaskLockReason(task) !== null) {
        errors.push({ taskId, studentId, reason: ERROR_CODES.TASK_LOCKED });
        continue;
      }

      const mutation = resolveRecordMutation(task.type, input);
      if (!mutation.ok) {
        errors.push({ taskId, studentId, reason: ERROR_CODES.RECORD_VALIDATION_FAILED });
        continue;
      }

      // 取消勾選（繳交）或清空成績 → 刪除記錄，回到「沒登記過」
      if (mutation.action === 'delete') {
        await deleteRecordByTaskStudent(taskId, studentId);
        results.push({ taskId, studentId, deleted: true });
        continue;
      }

      const isAssignedRecorder = computeIsAssignedRecorder(
        task.assignedSeatNumber,
        recorderSeatNumber
      );

      // 寫入並維護順序處理者名單（US4）。線上直接寫入用 now 作為 handledAt。
      await writeRecordWithHandler({
        taskId,
        studentId,
        submissionStatus: mutation.data.submissionStatus,
        gradeValue: mutation.data.gradeValue,
        recorderSeatNumber,
        isAssignedRecorder,
      });
      results.push({ taskId, studentId, updated: true });
    }

    const status = errors.length > 0 ? (results.length > 0 ? 207 : 409) : 200;
    return NextResponse.json(
      { updated: results.length, records: results, ...(errors.length > 0 ? { errors } : {}) },
      { status }
    );
  } catch (error) {
    console.error('Failed to update records:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}
