import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { TaskStatus } from '@/types';
import { detectAnomalies, type Anomaly } from '@/lib/anomalyDetection';

// 班級狀況 monitoring endpoint（002 US4 / FR-033, FR-035）。
// 回傳簡易統計 + 異常警告清單；異常判斷共用 src/lib/anomalyDetection.ts。

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;

    const tasks = await prisma.task.findMany({
      where: { roomId },
      include: { _count: { select: { records: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // 哪些任務已有「指定小老師」的登記（一次查詢避免 N+1）
    const assignedRecords = await prisma.record.findMany({
      where: { task: { roomId }, isAssignedRecorder: true },
      select: { taskId: true },
      distinct: ['taskId'],
    });
    const assignedSet = new Set(assignedRecords.map((r) => r.taskId));

    const now = Date.now();
    const warnings: {
      taskId: string;
      taskName: string;
      dueDate: Date | null;
      anomalies: Anomaly[];
    }[] = [];

    let archived = 0;
    let total = 0;
    let inProgress = 0;

    for (const task of tasks) {
      if (task.isArchived) {
        archived += 1;
        continue;
      }
      total += 1;
      if (task.status === TaskStatus.ACTIVE) inProgress += 1;

      const anomalies = detectAnomalies(
        {
          status: task.status,
          isArchived: task.isArchived,
          assignedSeatNumber: task.assignedSeatNumber,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          recordedCount: task._count.records,
          assignedRecorderHasRecord: assignedSet.has(task.id),
        },
        now
      );

      if (anomalies.length > 0) {
        warnings.push({
          taskId: task.id,
          taskName: task.name,
          dueDate: task.dueDate,
          anomalies,
        });
      }
    }

    return NextResponse.json({
      stats: { total, inProgress, anomalies: warnings.length, archived },
      warnings,
    });
  } catch (error) {
    console.error('Failed to load monitoring:', error);
    return NextResponse.json({ error: 'common.error' }, { status: 500 });
  }
}
