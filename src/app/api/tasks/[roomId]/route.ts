import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { TaskType } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 可選：依狀態過濾
    const includeArchived = searchParams.get('includeArchived') === 'true'; // 002 US3

    const tasks = await prisma.task.findMany({
      where: {
        roomId,
        ...(status ? { status } : {}),
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: {
        _count: { select: { records: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: '取得任務列表失敗' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { name, type, assignedSeatNumber, dueDate } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '任務名稱為必填欄位' }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: '任務名稱長度不可超過 100 字元' }, { status: 400 });
    }
    if (type !== TaskType.SUBMISSION && type !== TaskType.GRADE) {
      return NextResponse.json({ error: '任務類型必須為 SUBMISSION 或 GRADE' }, { status: 400 });
    }
    if (
      assignedSeatNumber != null &&
      (!Number.isInteger(assignedSeatNumber) || assignedSeatNumber < 1 || assignedSeatNumber > 99)
    ) {
      return NextResponse.json({ error: '指定座號必須在 1-99 之間' }, { status: 400 });
    }

    // 依「不預建空白 Record」決策：建立任務時不為學生預先建立記錄。
    const task = await prisma.task.create({
      data: {
        name: name.trim(),
        type,
        roomId,
        assignedSeatNumber: assignedSeatNumber ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: '建立任務失敗' }, { status: 500 });
  }
}
