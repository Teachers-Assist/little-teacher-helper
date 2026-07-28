import { NextResponse } from 'next/server';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { room, student, task } from '@/db/schema';
import { generateRoomCode } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacherId 為必填參數' },
        { status: 400 }
      );
    }

    const rooms = await db
      .select()
      .from(room)
      .where(eq(room.teacherId, teacherId))
      .orderBy(desc(room.createdAt));

    const roomIds = rooms.map((r) => r.id);
    // _count.students / _count.tasks：以 groupBy 一次算完（含全部學生，不濾 isRemoved，與原行為一致）
    const [studentCounts, taskCounts] = roomIds.length
      ? await Promise.all([
          db
            .select({ roomId: student.roomId, c: count() })
            .from(student)
            .where(inArray(student.roomId, roomIds))
            .groupBy(student.roomId),
          db
            .select({ roomId: task.roomId, c: count() })
            .from(task)
            .where(inArray(task.roomId, roomIds))
            .groupBy(task.roomId),
        ])
      : [[], []];

    const sMap = new Map(studentCounts.map((x) => [x.roomId, x.c]));
    const tMap = new Map(taskCounts.map((x) => [x.roomId, x.c]));

    const out = rooms.map((r) => ({
      ...r,
      _count: { students: sMap.get(r.id) ?? 0, tasks: tMap.get(r.id) ?? 0 },
    }));

    return NextResponse.json(out);
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
    return NextResponse.json(
      { error: '取得房間列表失敗' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { name, teacherId } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '房間名稱為必填欄位' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: '房間名稱長度不可超過 100 字元' },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacherId 為必填欄位' },
        { status: 400 }
      );
    }

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await db.select({ id: room.id }).from(room).where(eq(room.code, code)).limit(1);
      if (existing.length === 0) break;
      code = generateRoomCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      return NextResponse.json(
        { error: '無法產生唯一房間代碼，請稍後再試' },
        { status: 500 }
      );
    }

    const [created] = await db
      .insert(room)
      .values({ name: name.trim(), code, teacherId })
      .returning();

    return NextResponse.json({ ...created, _count: { students: 0, tasks: 0 } }, { status: 201 });
  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json(
      { error: '建立房間失敗' },
      { status: 500 }
    );
  }
}
