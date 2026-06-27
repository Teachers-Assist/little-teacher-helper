import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { TaskStatus, SubmissionStatus } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string; taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { _count: { select: { records: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: '找不到該任務' }, { status: 404 });
    }

    // 班級在籍學生總數（未登記者 = 查無 Record）
    const totalCount = await prisma.student.count({
      where: { roomId: task.roomId, isRemoved: false },
    });

    // 繳交類型統計：已繳 = 已登記的記錄數；未繳 = 總人數 − 已繳（未繳不存記錄）
    const submittedCount = await prisma.record.count({
      where: { taskId, submissionStatus: SubmissionStatus.SUBMITTED },
    });
    const notSubmittedCount = Math.max(totalCount - submittedCount, 0);

    return NextResponse.json({
      ...task,
      recordedCount: task._count.records,
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
    const { taskId } = await params;
    const body = await request.json();
    const { name, assignedSeatNumber, dueDate, status, isArchived } = body;

    const updateData: {
      name?: string;
      assignedSeatNumber?: number | null;
      dueDate?: Date | null;
      status?: string;
      isArchived?: boolean;
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
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json(task);
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
    const { taskId } = await params;

    // 刪除任務前先清掉其登記記錄（無 soft delete，直接移除）
    await prisma.$transaction([
      prisma.record.deleteMany({ where: { taskId } }),
      prisma.task.delete({ where: { id: taskId } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: '刪除任務失敗' }, { status: 500 });
  }
}
