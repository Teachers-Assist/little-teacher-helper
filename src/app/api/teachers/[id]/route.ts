import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        rooms: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: '找不到該老師' },
        { status: 404 }
      );
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error('Failed to get teacher:', error);
    return NextResponse.json(
      { error: '取得老師資訊失敗' },
      { status: 500 }
    );
  }
}

