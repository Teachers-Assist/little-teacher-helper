import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { student } from '@/db/schema';
import { ERROR_CODES } from '@/i18n/errorCodes';

// POST /restore：還原已移除學生（isRemoved=false）。002 US2 / FR-026。
// 座號 unique 約束涵蓋已移除學生，故座號從未被釋出，還原必定無衝突。
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const db = await getDb();
    const { id: roomId, studentId } = await params;

    const updated = await db
      .update(student)
      .set({ isRemoved: false })
      .where(and(eq(student.id, studentId), eq(student.roomId, roomId)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Failed to restore student:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}
