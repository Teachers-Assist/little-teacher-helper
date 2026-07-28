import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, isUniqueConstraintError } from '@/lib/db';
import { student } from '@/db/schema';
import { ERROR_CODES } from '@/i18n/errorCodes';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeRemoved = searchParams.get('includeRemoved') === 'true';

    const students = await db
      .select()
      .from(student)
      .where(and(eq(student.roomId, id), includeRemoved ? undefined : eq(student.isRemoved, false)))
      .orderBy(asc(student.seatNumber), asc(student.name));

    return NextResponse.json(students);
  } catch (error) {
    console.error('Failed to fetch students:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id: roomId } = await params;
    const body = await request.json();
    const { name, seatNumber } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_NAME_REQUIRED }, { status: 400 });
    }

    if (name.length > 50) {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_NAME_TOO_LONG }, { status: 400 });
    }

    if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 99) {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_SEAT_REQUIRED }, { status: 400 });
    }

    const [created] = await db
      .insert(student)
      .values({ name: name.trim(), seatNumber, roomId })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_SEAT_DUPLICATE }, { status: 409 });
    }
    console.error('Failed to create student:', error);
    return NextResponse.json({ error: ERROR_CODES.STUDENT_CREATE_FAILED }, { status: 500 });
  }
}
