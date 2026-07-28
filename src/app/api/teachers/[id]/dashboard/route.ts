import { NextResponse } from 'next/server';
import { and, count, desc, eq, inArray, max } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { record, room, student, task } from '@/db/schema';
import { TaskStatus } from '@/types';
import { detectAnomalies, type Anomaly } from '@/lib/anomalyDetection';

// Dashboard 資料 endpoint（002 US8 / FR-057）。
// 回傳跨班級簡易統計、班級清單、跨班級進行中任務清單。
// 異常判斷共用 src/lib/anomalyDetection.ts（與 US4 一致）。

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id: teacherId } = await params;

    const rooms = await db
      .select()
      .from(room)
      .where(eq(room.teacherId, teacherId))
      .orderBy(desc(room.createdAt));

    const roomIds = rooms.map((r) => r.id);

    // 每班在籍學生數（分母只計 isRemoved=false，FR-104）
    const studentCountMap = new Map<string, number>();
    // 各班進行中/封存無關的任務（isArchived=false）
    let tasks: (typeof task.$inferSelect)[] = [];
    if (roomIds.length > 0) {
      const [studentCounts, taskRows] = await Promise.all([
        db
          .select({ roomId: student.roomId, c: count() })
          .from(student)
          .where(and(inArray(student.roomId, roomIds), eq(student.isRemoved, false)))
          .groupBy(student.roomId),
        db
          .select()
          .from(task)
          .where(and(inArray(task.roomId, roomIds), eq(task.isArchived, false)))
          .orderBy(desc(task.createdAt)),
      ]);
      for (const s of studentCounts) studentCountMap.set(s.roomId, s.c);
      tasks = taskRows;
    }

    const taskIds = tasks.map((t) => t.id);

    // 每個任務的登記筆數（分子排除已移除學生，FR-104）與最後一次登記活動時間（US6 規則一）
    const recordedCountMap = new Map<string, number>();
    const lastByTask = new Map<string, Date>();
    if (taskIds.length > 0) {
      const grouped = await db
        .select({ taskId: record.taskId, c: count(), m: max(record.updatedAt) })
        .from(record)
        .innerJoin(student, eq(record.studentId, student.id))
        .where(and(inArray(record.taskId, taskIds), eq(student.isRemoved, false)))
        .groupBy(record.taskId);
      for (const g of grouped) {
        recordedCountMap.set(g.taskId, g.c);
        if (g.m != null) lastByTask.set(g.taskId, new Date(Number(g.m)));
      }
    }

    // 任務依班級分組（取代 Prisma 的 room.tasks include）
    const tasksByRoom = new Map<string, (typeof task.$inferSelect)[]>();
    for (const t of tasks) {
      const list = tasksByRoom.get(t.roomId);
      if (list) list.push(t);
      else tasksByRoom.set(t.roomId, [t]);
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
      const roomStudentCount = studentCountMap.get(room.id) ?? 0;

      for (const task of tasksByRoom.get(room.id) ?? []) {
        const recordedCount = recordedCountMap.get(task.id) ?? 0;
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
            recordedCount,
            classStudentCount: roomStudentCount,
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
          recordedCount,
          studentCount: roomStudentCount,
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
