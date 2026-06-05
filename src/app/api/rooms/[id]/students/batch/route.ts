import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { messages } from '@/messages/zh-TW';

interface StudentInput {
  name: string;
  seatNumber: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await request.json();
    const { students } = body as { students: StudentInput[] };

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: messages.student.batchEmpty }, { status: 400 });
    }

    if (students.length > 50) {
      return NextResponse.json({ error: messages.student.batchTooMany }, { status: 400 });
    }

    // Validate each student
    for (const student of students) {
      if (!student.name || student.name.trim().length === 0) {
        return NextResponse.json({ error: messages.student.nameRequired }, { status: 400 });
      }
      if (student.name.length > 50) {
        return NextResponse.json({ error: messages.student.nameTooLong }, { status: 400 });
      }
      if (
        !Number.isInteger(student.seatNumber) ||
        student.seatNumber < 1 ||
        student.seatNumber > 99
      ) {
        return NextResponse.json({ error: messages.student.seatRequired }, { status: 400 });
      }
    }

    // 名單內座號不可重複
    const seats = students.map((s) => s.seatNumber);
    if (new Set(seats).size !== seats.length) {
      return NextResponse.json({ error: messages.student.seatDuplicateInList }, { status: 400 });
    }

    // Create all students
    const createdStudents = await prisma.$transaction(
      students.map((student) =>
        prisma.student.create({
          data: {
            name: student.name.trim(),
            seatNumber: student.seatNumber,
            roomId,
          },
        })
      )
    );

    return NextResponse.json(
      {
        created: createdStudents.length,
        students: createdStudents,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: messages.student.seatDuplicateExisting }, { status: 409 });
    }
    console.error('Failed to batch create students:', error);
    return NextResponse.json({ error: messages.student.batchFailed }, { status: 500 });
  }
}

