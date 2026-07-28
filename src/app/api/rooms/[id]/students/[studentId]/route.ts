import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, isUniqueConstraintError } from '@/lib/db';
import { student } from '@/db/schema';
import { ERROR_CODES } from '@/i18n/errorCodes';

// PATCH：編輯學生（姓名 / 座號）。002 US2。
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const db = await getDb();
    const { id: roomId, studentId } = await params;
    const body = await request.json();
    const { name, seatNumber } = body as { name?: string; seatNumber?: number };

    const data: { name?: string; seatNumber?: number } = {};

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: ERROR_CODES.STUDENT_NAME_REQUIRED }, { status: 400 });
      }
      if (name.length > 50) {
        return NextResponse.json({ error: ERROR_CODES.STUDENT_NAME_TOO_LONG }, { status: 400 });
      }
      data.name = name.trim();
    }

    if (seatNumber !== undefined) {
      if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 99) {
        return NextResponse.json({ error: ERROR_CODES.STUDENT_SEAT_REQUIRED }, { status: 400 });
      }
      data.seatNumber = seatNumber;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_NAME_REQUIRED }, { status: 400 });
    }

    const updated = await db
      .update(student)
      .set(data)
      .where(and(eq(student.id, studentId), eq(student.roomId, roomId)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    // 座號與班級內其他學生重複（含已移除學生，因 unique 約束涵蓋）
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_SEAT_DUPLICATE }, { status: 409 });
    }
    console.error('Failed to update student:', error);
    return NextResponse.json({ error: ERROR_CODES.STUDENT_CREATE_FAILED }, { status: 500 });
  }
}

// DELETE：軟刪除（isRemoved=true）。歷史登記記錄保留。002 US2 / FR-025。
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const db = await getDb();
    const { id: roomId, studentId } = await params;

    const updated = await db
      .update(student)
      .set({ isRemoved: true })
      .where(and(eq(student.id, studentId), eq(student.roomId, roomId)))
      .returning({ id: student.id });

    if (updated.length === 0) {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to remove student:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}
