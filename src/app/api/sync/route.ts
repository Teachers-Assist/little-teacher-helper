import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { computeIsAssignedRecorder, getTaskLockReason, resolveRecordMutation } from '@/lib/task';

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
    const body = await request.json();
    const { operations } = body as {
      deviceId?: string;
      operations: SyncOperation[];
    };

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: '請提供要同步的操作' }, { status: 400 });
    }

    // 一次撈出涉及任務，供類型驗證與鎖定判斷
    const taskIds = [...new Set(operations.map((op) => op.payload?.taskId).filter(Boolean))];
    const tasks = await prisma.task.findMany({ where: { id: { in: taskIds } } });
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const syncedIds: string[] = [];
    const conflicts: Array<{ operationId: string; reason: string }> = [];

    for (const operation of operations) {
      if (operation.type !== 'UPDATE_RECORD') {
        conflicts.push({ operationId: operation.id, reason: '不支援的操作類型' });
        continue;
      }

      const { taskId, studentId, recorderSeatNumber } = operation.payload;
      const task = taskMap.get(taskId);

      if (!task) {
        conflicts.push({ operationId: operation.id, reason: '找不到該任務' });
        continue;
      }
      if (getTaskLockReason(task) !== null) {
        conflicts.push({ operationId: operation.id, reason: '任務已鎖定，無法登記' });
        continue;
      }

      const mutation = resolveRecordMutation(task.type, operation.payload);
      if (!mutation.ok) {
        conflicts.push({ operationId: operation.id, reason: mutation.error });
        continue;
      }

      try {
        if (mutation.action === 'delete') {
          // 取消勾選 / 清空成績 → 刪除記錄
          await prisma.record.deleteMany({ where: { taskId, studentId } });
          syncedIds.push(operation.id);
          continue;
        }

        const isAssignedRecorder = computeIsAssignedRecorder(
          task.assignedSeatNumber,
          recorderSeatNumber
        );

        await prisma.record.upsert({
          where: { taskId_studentId: { taskId, studentId } },
          update: {
            ...mutation.data,
            recorderSeatNumber,
            isAssignedRecorder,
            syncedAt: new Date(),
          },
          create: {
            taskId,
            studentId,
            ...mutation.data,
            recorderSeatNumber,
            isAssignedRecorder,
            syncedAt: new Date(),
          },
        });

        syncedIds.push(operation.id);
      } catch (error) {
        console.error('Failed to sync operation:', operation.id, error);
        conflicts.push({ operationId: operation.id, reason: '同步失敗' });
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
    return NextResponse.json({ error: '同步失敗' }, { status: 500 });
  }
}
