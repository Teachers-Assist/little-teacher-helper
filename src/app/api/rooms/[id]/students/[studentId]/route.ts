import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { ERROR_CODES } from '@/i18n/errorCodes';

// PATCH：編輯學生（姓名 / 座號）。002 US2。
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
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

    const student = await prisma.student.update({
      where: { id: studentId, roomId },
      data,
    });

    return NextResponse.json(student);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // 座號與班級內其他學生重複（含已移除學生，因 unique 約束涵蓋）
      if (error.code === 'P2002') {
        return NextResponse.json({ error: ERROR_CODES.STUDENT_SEAT_DUPLICATE }, { status: 409 });
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 404 });
      }
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
    const { id: roomId, studentId } = await params;

    await prisma.student.update({
      where: { id: studentId, roomId },
      data: { isRemoved: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 404 });
    }
    console.error('Failed to remove student:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}
