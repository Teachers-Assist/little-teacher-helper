import { NextResponse } from 'next/server';
import { and, count, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { record, recordHandler, student, task } from '@/db/schema';
import { TaskStatus, SubmissionStatus } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string; taskId: string }> }
) {
  try {
    const db = await getDb();
    const { taskId } = await params;

    const [found] = await db.select().from(task).where(eq(task.id, taskId)).limit(1);

    if (!found) {
      return NextResponse.json({ error: '找不到該任務' }, { status: 404 });
    }

    const [{ c: recordedCount }] = await db
      .select({ c: count() })
      .from(record)
      .where(eq(record.taskId, taskId));

    // 班級在籍學生總數（未登記者 = 查無 Record）
    const [{ c: totalCount }] = await db
      .select({ c: count() })
      .from(student)
      .where(and(eq(student.roomId, found.roomId), eq(student.isRemoved, false)));

    // 繳交類型統計：已繳 = 已登記的記錄數；未繳 = 總人數 − 已繳（未繳不存記錄）
    const [{ c: submittedCount }] = await db
      .select({ c: count() })
      .from(record)
      .where(and(eq(record.taskId, taskId), eq(record.submissionStatus, SubmissionStatus.SUBMITTED)));
    const notSubmittedCount = Math.max(totalCount - submittedCount, 0);

    return NextResponse.json({
      ...found,
      recordedCount,
      totalCount,
      submittedCount,
      notSubmittedCount,
    });
  } catch (error) {
    console.error('Failed to get task:', error);
    return NextResponse.json({ error: '取得任務資訊失敗' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string; taskId: string }> }
) {
  try {
    const db = await getDb();
    const { taskId } = await params;
    const body = await request.json();
    const { name, assignedSeatNumber, dueDate, status, isArchived } = body;

    const updateData: {
      name?: string;
      assignedSeatNumber?: number | null;
      dueDate?: Date | null;
      status?: string;
      isArchived?: boolean;
      archivedAt?: Date | null;
    } = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json({ error: '任務名稱不可為空' }, { status: 400 });
      }
      if (name.length > 100) {
        return NextResponse.json({ error: '任務名稱長度不可超過 100 字元' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (assignedSeatNumber !== undefined) {
      if (
        assignedSeatNumber !== null &&
        (!Number.isInteger(assignedSeatNumber) || assignedSeatNumber < 1 || assignedSeatNumber > 99)
      ) {
        return NextResponse.json({ error: '指定座號必須在 1-99 之間' }, { status: 400 });
      }
      updateData.assignedSeatNumber = assignedSeatNumber;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (status !== undefined) {
      const valid = [TaskStatus.ACTIVE, TaskStatus.HELPER_COMPLETED, TaskStatus.CLOSED];
      if (!valid.includes(status)) {
        return NextResponse.json(
          { error: 'status 必須為 ACTIVE、HELPER_COMPLETED 或 CLOSED' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // 002 US3：軟封存（isArchived=true 封存 / false 還原），與 status 獨立
    if (isArchived !== undefined) {
      if (typeof isArchived !== 'boolean') {
        return NextResponse.json({ error: 'isArchived 必須為布林值' }, { status: 400 });
      }
      updateData.isArchived = isArchived;
      // 004 FR-097a：記下 / 清除封存時間，供辨識「封存後才同步進來」的登記
      updateData.archivedAt = isArchived ? new Date() : null;
    }

    const [updated] = await db.update(task).set(updateData).where(eq(task.id, taskId)).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: '更新任務失敗' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomId: string; taskId: string }> }
) {
  try {
    const db = await getDb();
    const { taskId } = await params;

    // 刪除任務前先清掉其登記記錄與名單（無 soft delete，直接移除）。
    // D1 無互動式 transaction，循序刪除：handlers → records → task。
    const recIds = (
      await db.select({ id: record.id }).from(record).where(eq(record.taskId, taskId))
    ).map((r) => r.id);
    if (recIds.length > 0) {
      await db.delete(recordHandler).where(inArray(recordHandler.recordId, recIds));
    }
    await db.delete(record).where(eq(record.taskId, taskId));
    await db.delete(task).where(eq(task.id, taskId));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: '刪除任務失敗' }, { status: 500 });
  }
}
