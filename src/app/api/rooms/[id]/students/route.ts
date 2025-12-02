import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

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
    return NextResponse.json(
      { error: '取得學生列表失敗' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: '學生名字為必填欄位' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: '學生名字長度不可超過 50 字元' },
        { status: 400 }
      );
    }

    if (seatNumber !== undefined && (seatNumber < 1 || seatNumber > 99)) {
      return NextResponse.json(
        { error: '座號必須在 1-99 之間' },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        seatNumber: seatNumber || null,
        roomId,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Failed to create student:', error);
    return NextResponse.json(
      { error: '新增學生失敗' },
      { status: 500 }
    );
  }
}

