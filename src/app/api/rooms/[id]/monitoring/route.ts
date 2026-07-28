import { NextResponse } from 'next/server';
import { and, count, desc, eq, inArray, max } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { record, student, task } from '@/db/schema';
import { TaskStatus } from '@/types';
import { detectAnomalies, type Anomaly } from '@/lib/anomalyDetection';

// 班級狀況 monitoring endpoint（002 US4 / FR-033, FR-035）。
// 回傳簡易統計 + 異常警告清單；異常判斷共用 src/lib/anomalyDetection.ts。

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id: roomId } = await params;

    const tasks = await db
      .select()
      .from(task)
      .where(eq(task.roomId, roomId))
      .orderBy(desc(task.createdAt));

    // 分母：班級在籍學生數（只計 isRemoved=false，FR-104）
    const [{ c: classStudentCount }] = await db
      .select({ c: count() })
      .from(student)
      .where(and(eq(student.roomId, roomId), eq(student.isRemoved, false)));

    const taskIds = tasks.map((t) => t.id);
    // 每個任務的登記筆數（分子，排除已移除學生，FR-104）與最後一次登記活動時間（滑動視窗起算點）
    const recMap = new Map<string, number>();
    const lastByTask = new Map<string, Date>();
    if (taskIds.length > 0) {
      const grouped = await db
        .select({ taskId: record.taskId, c: count(), m: max(record.updatedAt) })
        .from(record)
        .innerJoin(student, eq(record.studentId, student.id))
        .where(and(inArray(record.taskId, taskIds), eq(student.isRemoved, false)))
        .groupBy(record.taskId);
      for (const g of grouped) {
        recMap.set(g.taskId, g.c);
        if (g.m != null) lastByTask.set(g.taskId, new Date(Number(g.m)));
      }
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
          recordedCount: recMap.get(task.id) ?? 0,
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
