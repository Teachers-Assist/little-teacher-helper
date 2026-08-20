import { NextResponse } from 'next/server';
import { getDb, isUniqueConstraintError } from '@/lib/db';
import { insertStudents } from '@/lib/studentInsert';
import { ERROR_CODES } from '@/i18n/errorCodes';

interface StudentInput {
  name: string;
  seatNumber: number;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id: roomId } = await params;
    const body = await request.json();
    const { students } = body as { students: StudentInput[] };

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_BATCH_EMPTY }, { status: 400 });
    }

    if (students.length > 50) {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_BATCH_TOO_MANY }, { status: 400 });
    }

    // Validate each student
    for (const student of students) {
      if (!student.name || student.name.trim().length === 0) {
        return NextResponse.json({ error: ERROR_CODES.STUDENT_NAME_REQUIRED }, { status: 400 });
      }
      if (student.name.length > 50) {
        return NextResponse.json({ error: ERROR_CODES.STUDENT_NAME_TOO_LONG }, { status: 400 });
      }
      if (
        !Number.isInteger(student.seatNumber) ||
        student.seatNumber < 1 ||
        student.seatNumber > 99
      ) {
        return NextResponse.json({ error: ERROR_CODES.STUDENT_SEAT_REQUIRED }, { status: 400 });
      }
    }

    // 名單內座號不可重複
    const seats = students.map((s) => s.seatNumber);
    if (new Set(seats).size !== seats.length) {
      return NextResponse.json(
        { error: ERROR_CODES.STUDENT_SEAT_DUPLICATE_IN_LIST },
        { status: 400 }
      );
    }

    // 全或無：依 D1 綁定參數上限分段後，用單一 transaction 送出
    //（任一座號與現有衝突則整批失敗，不會部分寫入）
    const createdStudents = await insertStudents(
      db,
      students.map((s) => ({ name: s.name.trim(), seatNumber: s.seatNumber, roomId }))
    );

    return NextResponse.json(
      {
        created: createdStudents.length,
        students: createdStudents,
      },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: ERROR_CODES.STUDENT_SEAT_DUPLICATE_EXISTING },
        { status: 409 }
      );
    }
    console.error('Failed to batch create students:', error);
    return NextResponse.json({ error: ERROR_CODES.STUDENT_BATCH_FAILED }, { status: 500 });
  }
}
