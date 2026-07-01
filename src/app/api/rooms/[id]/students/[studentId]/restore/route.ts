import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { ERROR_CODES } from '@/i18n/errorCodes';

// POST /restore：還原已移除學生（isRemoved=false）。002 US2 / FR-026。
// 座號 unique 約束涵蓋已移除學生，故座號從未被釋出，還原必定無衝突。
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: roomId, studentId } = await params;

    const student = await prisma.student.update({
      where: { id: studentId, roomId },
      data: { isRemoved: false },
    });

    return NextResponse.json(student);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 404 });
    }
    console.error('Failed to restore student:', error);
    return NextResponse.json({ error: ERROR_CODES.INTERNAL_ERROR }, { status: 500 });
  }
}
