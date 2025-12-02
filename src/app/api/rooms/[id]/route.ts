import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            students: true,
            items: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: '找不到該房間' },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Failed to get room:', error);
    return NextResponse.json(
      { error: '取得房間資訊失敗' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, isActive } = body;

    const updateData: { name?: string; isActive?: boolean } = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: '房間名稱不可為空' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: '房間名稱長度不可超過 100 字元' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Failed to update room:', error);
    return NextResponse.json(
      { error: '更新房間失敗' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.room.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete room:', error);
    return NextResponse.json(
      { error: '刪除房間失敗' },
      { status: 500 }
    );
  }
}

