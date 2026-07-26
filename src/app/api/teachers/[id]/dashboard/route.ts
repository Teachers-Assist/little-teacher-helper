import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { TaskStatus } from '@/types';
import { detectAnomalies, type Anomaly } from '@/lib/anomalyDetection';

// Dashboard 資料 endpoint（002 US8 / FR-057）。
// 回傳跨班級簡易統計、班級清單、跨班級進行中任務清單。
// 異常判斷共用 src/lib/anomalyDetection.ts（與 US4 一致）。

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: teacherId } = await params;

    const rooms = await prisma.room.findMany({
      where: { teacherId },
      include: {
        // 分母只計在籍學生（FR-104）
        _count: { select: { students: { where: { isRemoved: false } } } },
        tasks: {
          where: { isArchived: false },
          // 分子排除已移除學生的紀錄（FR-104）
          include: { _count: { select: { records: { where: { student: { isRemoved: false } } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const taskIds = rooms.flatMap((r) => r.tasks.map((t) => t.id));

    // 每個任務的最後一次登記活動時間（滑動視窗起算點，US6 規則一）
    const lastByTask = new Map<string, Date>();
    if (taskIds.length > 0) {
      const grouped = await prisma.record.groupBy({
        by: ['taskId'],
        where: { taskId: { in: taskIds }, student: { isRemoved: false } },
        _max: { updatedAt: true },
      });
      for (const g of grouped) if (g._max.updatedAt) lastByTask.set(g.taskId, g._max.updatedAt);
    }

    const now = Date.now();

    const tasksOut: {
      id: string;
      roomId: string;
      roomName: string;
      name: string;
      type: string;
      status: string;
      dueDate: string | null;
      recordedCount: number;
      studentCount: number;
      isAnomaly: boolean;
      anomalies: Anomaly[];
      lastActivityAt: string;
    }[] = [];

    const roomsOut: {
      id: string;
      name: string;
      inProgressTaskCount: number;
      anomalyCount: number;
      lastActivityAt: string;
    }[] = [];

    let inProgressTaskCount = 0;
    let anomalyCount = 0;

    for (const room of rooms) {
      let roomInProgress = 0;
      let roomAnomalies = 0;
      let roomLastActivity = room.createdAt.getTime();

      for (const task of room.tasks) {
        const lastAt = lastByTask.get(task.id) ?? task.createdAt;
        roomLastActivity = Math.max(roomLastActivity, new Date(lastAt).getTime());

        // 異常偵測涵蓋 ACTIVE（規則一、二）與 HELPER_COMPLETED（規則三，FR-122）——
        // 先算再依 status 決定是否列入「進行中任務」清單。
        const anomalies = detectAnomalies(
          {
            status: task.status,
            isArchived: task.isArchived,
            dueDate: task.dueDate,
            createdAt: task.createdAt,
            recordedCount: task._count.records,
            classStudentCount: room._count.students,
            lastRecordActivityAt: lastByTask.get(task.id) ?? null,
          },
          now
        );
        if (anomalies.length > 0) roomAnomalies += 1;

        if (task.status !== TaskStatus.ACTIVE) continue; // tasksOut 僅列進行中任務
        roomInProgress += 1;

        tasksOut.push({
          id: task.id,
          roomId: room.id,
          roomName: room.name,
          name: task.name,
          type: task.type,
          status: task.status,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          recordedCount: task._count.records,
          studentCount: room._count.students,
          isAnomaly: anomalies.length > 0,
          anomalies,
          lastActivityAt: new Date(lastAt).toISOString(),
        });
      }

      inProgressTaskCount += roomInProgress;
      anomalyCount += roomAnomalies;

      roomsOut.push({
        id: room.id,
        name: room.name,
        inProgressTaskCount: roomInProgress,
        anomalyCount: roomAnomalies,
        lastActivityAt: new Date(roomLastActivity).toISOString(),
      });
    }

    tasksOut.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    roomsOut.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));

    return NextResponse.json({
      stats: { roomCount: rooms.length, inProgressTaskCount, anomalyCount },
      rooms: roomsOut,
      tasks: tasksOut,
    });
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    return NextResponse.json({ error: 'common.error' }, { status: 500 });
  }
}
