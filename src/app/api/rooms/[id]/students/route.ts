import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { ERROR_CODES } from '@/i18n/errorCodes';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeRemoved = searchParams.get('includeRemoved') === 'true';

    const students = await prisma.student.findMany({
      where: {
        roomId: id,
        ...(includeRemoved ? {} : { isRemoved: false }),
      },
      orderBy: [{ seatNumber: 'asc' }, { name: 'asc' }],
    });

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

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        seatNumber,
        roomId,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: ERROR_CODES.STUDENT_SEAT_DUPLICATE }, { status: 409 });
    }
    console.error('Failed to create student:', error);
    return NextResponse.json({ error: ERROR_CODES.STUDENT_CREATE_FAILED }, { status: 500 });
  }
}

