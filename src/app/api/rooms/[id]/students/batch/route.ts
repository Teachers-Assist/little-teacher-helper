import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface StudentInput {
  name: string;
  seatNumber?: number;
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
      return NextResponse.json(
        { error: '請提供學生名單' },
        { status: 400 }
      );
    }

    if (students.length > 50) {
      return NextResponse.json(
        { error: '一次最多新增 50 位學生' },
        { status: 400 }
      );
    }

    // Validate each student
    for (const student of students) {
      if (!student.name || student.name.trim().length === 0) {
        return NextResponse.json(
          { error: '學生名字不可為空' },
          { status: 400 }
        );
      }
      if (student.name.length > 50) {
        return NextResponse.json(
          { error: '學生名字長度不可超過 50 字元' },
          { status: 400 }
        );
      }
      if (
        student.seatNumber !== undefined &&
        (student.seatNumber < 1 || student.seatNumber > 99)
      ) {
        return NextResponse.json(
          { error: '座號必須在 1-99 之間' },
          { status: 400 }
        );
      }
    }

    // Create all students
    const createdStudents = await prisma.$transaction(
      students.map((student) =>
        prisma.student.create({
          data: {
            name: student.name.trim(),
            seatNumber: student.seatNumber || null,
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
    console.error('Failed to batch create students:', error);
    return NextResponse.json(
      { error: '批次新增學生失敗' },
      { status: 500 }
    );
  }
}

