import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { messages } from '@/messages/zh-TW';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        students: {
          where: { isRemoved: false },
          select: {
            id: true,
            name: true,
            seatNumber: true,
          },
          orderBy: [{ seatNumber: 'asc' }, { name: 'asc' }],
        },
        tasks: {
          select: {
            id: true,
            name: true,
            type: true,
            assignedSeatNumber: true,
            dueDate: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: messages.join.roomNotFound }, { status: 404 });
    }

    if (!room.isActive) {
      return NextResponse.json({ error: messages.join.roomInactive }, { status: 404 });
    }

    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
      },
      students: room.students,
      tasks: room.tasks,
    });
  } catch (error) {
    console.error('Failed to join room:', error);
    return NextResponse.json(
      { error: '加入房間失敗' },
      { status: 500 }
    );
  }
}

