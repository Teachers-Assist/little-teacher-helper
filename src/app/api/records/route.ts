import { NextResponse } from 'next/server';
import { asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { record, recordHandler, task } from '@/db/schema';
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
      },
    });

    // US4：順序處理者名單（依時間）。鏈以 (taskId, studentId) 為 key、與 record 的存在
    // 與否無關，故另行查詢後依 studentId 併入，而非走 record 的關聯。
    const handlerRows = await db
      .select({
        studentId: recordHandler.studentId,
        seatNumber: recordHandler.seatNumber,
        action: recordHandler.action,
        handledAt: recordHandler.handledAt,
      })
      .from(recordHandler)
      .where(eq(recordHandler.taskId, taskId))
      .orderBy(asc(recordHandler.handledAt));

    const chains = new Map<string, Array<Omit<(typeof handlerRows)[number], 'studentId'>>>();
    for (const { studentId, ...step } of handlerRows) {
      const chain = chains.get(studentId);
      if (chain) chain.push(step);
      else chains.set(studentId, [step]);
    }

    const withHandlers = records.map((r) => ({ ...r, handlers: chains.get(r.studentId) ?? [] }));

    // 依 student.seatNumber、name 排序（關聯欄位無法於 DB 端排序，改於記憶體排序）
    withHandlers.sort(
      (a, b) => a.student.seatNumber - b.student.seatNumber || a.student.name.localeCompare(b.student.name)
    );

    return NextResponse.json(withHandlers);
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

      // 取消勾選（繳交）或清空成績 → 刪除記錄，回到「沒登記過」。
      // 經手鏈保留並記下這次刪除是誰做的（FR-093a）。
      if (mutation.action === 'delete') {
        await deleteRecordByTaskStudent({ taskId, studentId, recorderSeatNumber });
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
