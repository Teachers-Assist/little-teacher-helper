import { NextResponse } from 'next/server';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { record, task } from '@/db/schema';
import { TaskType } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const db = await getDb();
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 可選：依狀態過濾
    const includeArchived = searchParams.get('includeArchived') === 'true'; // 002 US3

    const tasks = await db
      .select()
      .from(task)
      .where(
        and(
          eq(task.roomId, roomId),
          status ? eq(task.status, status) : undefined,
          includeArchived ? undefined : eq(task.isArchived, false)
        )
      )
      .orderBy(desc(task.createdAt));

    // _count.records（全部登記，不濾學生，與原行為一致）
    const ids = tasks.map((t) => t.id);
    const rc = ids.length
      ? await db
          .select({ taskId: record.taskId, c: count() })
          .from(record)
          .where(inArray(record.taskId, ids))
          .groupBy(record.taskId)
      : [];
    const rcMap = new Map(rc.map((x) => [x.taskId, x.c]));

    const out = tasks.map((t) => ({ ...t, _count: { records: rcMap.get(t.id) ?? 0 } }));

    return NextResponse.json(out);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: '取得任務列表失敗' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const db = await getDb();
    const { roomId } = await params;
    const body = await request.json();
    const { name, type, assignedSeatNumber, dueDate } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '任務名稱為必填欄位' }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: '任務名稱長度不可超過 100 字元' }, { status: 400 });
    }
    if (type !== TaskType.SUBMISSION && type !== TaskType.GRADE) {
      return NextResponse.json({ error: '任務類型必須為 SUBMISSION 或 GRADE' }, { status: 400 });
    }
    if (
      assignedSeatNumber != null &&
      (!Number.isInteger(assignedSeatNumber) || assignedSeatNumber < 1 || assignedSeatNumber > 99)
    ) {
      return NextResponse.json({ error: '指定座號必須在 1-99 之間' }, { status: 400 });
    }

    // 依「不預建空白 Record」決策：建立任務時不為學生預先建立記錄。
    const [created] = await db
      .insert(task)
      .values({
        name: name.trim(),
        type,
        roomId,
        assignedSeatNumber: assignedSeatNumber ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: '建立任務失敗' }, { status: 500 });
  }
}
