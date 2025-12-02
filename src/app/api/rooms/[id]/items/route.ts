import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const items = await prisma.item.findMany({
      where: {
        roomId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json(
      { error: '取得項目列表失敗' },
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
    const { name, dueDate } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '項目名稱為必填欄位' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: '項目名稱長度不可超過 100 字元' },
        { status: 400 }
      );
    }

    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        roomId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // Create initial submissions for all students in the room
    const students = await prisma.student.findMany({
      where: { roomId, isRemoved: false },
      select: { id: true },
    });

    if (students.length > 0) {
      await prisma.submission.createMany({
        data: students.map((student) => ({
          studentId: student.id,
          itemId: item.id,
          status: 'NOT_SUBMITTED',
        })),
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to create item:', error);
    return NextResponse.json(
      { error: '建立項目失敗' },
      { status: 500 }
    );
  }
}

