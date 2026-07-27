import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TaskStatus } from '@/types';
import { detectAnomalies, type Anomaly } from '@/lib/anomalyDetection';

// 班級狀況 monitoring endpoint（002 US4 / FR-033, FR-035）。
// 回傳簡易統計 + 異常警告清單；異常判斷共用 src/lib/anomalyDetection.ts。

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const prisma = await getDb();
    const { id: roomId } = await params;

    const tasks = await prisma.task.findMany({
      where: { roomId },
      // 分子排除已移除學生的紀錄（FR-104）
      include: { _count: { select: { records: { where: { student: { isRemoved: false } } } } } },
      orderBy: { createdAt: 'desc' },
    });

    // 分母：班級在籍學生數（只計 isRemoved=false，FR-104）
    const classStudentCount = await prisma.student.count({
      where: { roomId, isRemoved: false },
    });

    // 每個任務的最後一次登記活動時間（滑動視窗起算點，US6 規則一）
    const lastByTask = new Map<string, Date>();
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length > 0) {
      const grouped = await prisma.record.groupBy({
        by: ['taskId'],
        where: { taskId: { in: taskIds }, student: { isRemoved: false } },
        _max: { updatedAt: true },
      });
      for (const g of grouped) if (g._max.updatedAt) lastByTask.set(g.taskId, g._max.updatedAt);
    }

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
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          recordedCount: task._count.records,
          classStudentCount,
          lastRecordActivityAt: lastByTask.get(task.id) ?? null,
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
