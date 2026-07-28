import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { room } from '@/db/schema';
import { ERROR_CODES } from '@/i18n/errorCodes';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const db = await getDb();
    const { code } = await params;

    const found = await db.query.room.findFirst({
      where: eq(room.code, code.toUpperCase()),
      columns: { id: true, name: true, code: true },
      with: {
        students: {
          where: (s, { eq: eqOp }) => eqOp(s.isRemoved, false),
          columns: { id: true, name: true, seatNumber: true },
          orderBy: (s, { asc }) => [asc(s.seatNumber), asc(s.name)],
        },
        tasks: {
          columns: {
            id: true,
            name: true,
            type: true,
            assignedSeatNumber: true,
            dueDate: true,
            status: true,
          },
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        },
      },
    });

    if (!found) {
      return NextResponse.json({ error: ERROR_CODES.ROOM_NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json({
      room: {
        id: found.id,
        name: found.name,
        code: found.code,
      },
      students: found.students,
      tasks: found.tasks,
    });
  } catch (error) {
    console.error('Failed to join room:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}
