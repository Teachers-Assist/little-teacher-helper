import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;

    const submissions = await prisma.submission.findMany({
      where: { itemId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            seatNumber: true,
            isRemoved: true,
          },
        },
      },
      orderBy: [
        { student: { seatNumber: 'asc' } },
        { student: { name: 'asc' } },
      ],
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    return NextResponse.json(
      { error: '取得繳交記錄失敗' },
      { status: 500 }
    );
  }
}

