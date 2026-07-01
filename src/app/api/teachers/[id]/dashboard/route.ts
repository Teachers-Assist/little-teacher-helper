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
        _count: { select: { students: true } },
        tasks: {
          where: { isArchived: false },
          include: { _count: { select: { records: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const taskIds = rooms.flatMap((r) => r.tasks.map((t) => t.id));

    // 每個任務的最後活動時間（最後一筆登記）與是否有指定小老師的登記
    const lastByTask = new Map<string, Date>();
    const assignedSet = new Set<string>();
    if (taskIds.length > 0) {
      const grouped = await prisma.record.groupBy({
        by: ['taskId'],
        where: { taskId: { in: taskIds } },
        _max: { updatedAt: true },
      });
      for (const g of grouped) if (g._max.updatedAt) lastByTask.set(g.taskId, g._max.updatedAt);

      const assigned = await prisma.record.findMany({
        where: { taskId: { in: taskIds }, isAssignedRecorder: true },
        select: { taskId: true },
        distinct: ['taskId'],
      });
      for (const a of assigned) assignedSet.add(a.taskId);
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

        if (task.status !== TaskStatus.ACTIVE) continue;
        roomInProgress += 1;

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
        if (anomalies.length > 0) roomAnomalies += 1;

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
