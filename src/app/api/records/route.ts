import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { computeIsAssignedRecorder, getTaskLockReason, resolveRecordMutation } from '@/lib/task';
import { ERROR_CODES, type ErrorCode } from '@/i18n/errorCodes';
import { writeRecordWithHandler } from '@/lib/recordWrite';

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
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 400 });
    }

    const records = await prisma.record.findMany({
      where: { taskId },
      include: {
        student: {
          select: { id: true, name: true, seatNumber: true, isRemoved: true },
        },
      },
      orderBy: [{ student: { seatNumber: 'asc' } }, { student: { name: 'asc' } }],
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Failed to fetch records:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}

/** 批次新增/更新登記記錄（含離線同步）。 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { records } = body as { records: RecordInput[] };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 400 });
    }

    // 一次撈出涉及的任務，供類型驗證與鎖定判斷
    const taskIds = [...new Set(records.map((r) => r.taskId))];
    const tasks = await prisma.task.findMany({ where: { id: { in: taskIds } } });
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
        await prisma.record.deleteMany({ where: { taskId, studentId } });
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
