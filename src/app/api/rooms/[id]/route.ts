import { NextResponse } from 'next/server';
import { count, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { room, student, task } from '@/db/schema';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;

    const found = await db.query.room.findFirst({
      where: eq(room.id, id),
      with: {
        teacher: { columns: { id: true, name: true } },
      },
    });

    if (!found) {
      return NextResponse.json(
        { error: '找不到該房間' },
        { status: 404 }
      );
    }

    const [{ c: students }] = await db
      .select({ c: count() })
      .from(student)
      .where(eq(student.roomId, id));
    const [{ c: tasks }] = await db.select({ c: count() }).from(task).where(eq(task.roomId, id));

    return NextResponse.json({ ...found, _count: { students, tasks } });
  } catch (error) {
    console.error('Failed to get room:', error);
    return NextResponse.json(
      { error: '取得房間資訊失敗' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    const updateData: { name?: string } = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: '房間名稱不可為空' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: '房間名稱長度不可超過 100 字元' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    const [updated] = await db.update(room).set(updateData).where(eq(room.id, id)).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update room:', error);
    return NextResponse.json(
      { error: '更新房間失敗' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;

    await db.delete(room).where(eq(room.id, id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete room:', error);
    return NextResponse.json(
      { error: '刪除房間失敗' },
      { status: 500 }
    );
  }
}
