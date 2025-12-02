import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: '找不到該項目' },
        { status: 404 }
      );
    }

    // Get submission statistics
    const submissions = await prisma.submission.groupBy({
      by: ['status'],
      where: { itemId: id },
      _count: true,
    });

    const stats = {
      submittedCount: submissions.find((s) => s.status === 'SUBMITTED')?._count || 0,
      notSubmittedCount: submissions.find((s) => s.status === 'NOT_SUBMITTED')?._count || 0,
      totalCount: item._count.submissions,
    };

    return NextResponse.json({
      ...item,
      ...stats,
    });
  } catch (error) {
    console.error('Failed to get item:', error);
    return NextResponse.json(
      { error: '取得項目資訊失敗' },
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
    const { name, dueDate, isActive } = body;

    const updateData: { name?: string; dueDate?: Date | null; isActive?: boolean } = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: '項目名稱不可為空' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: '項目名稱長度不可超過 100 字元' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to update item:', error);
    return NextResponse.json(
      { error: '更新項目失敗' },
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

    // Soft delete - just mark as inactive
    await prisma.item.update({
      where: { id },
      data: { isActive: false },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete item:', error);
    return NextResponse.json(
      { error: '刪除項目失敗' },
      { status: 500 }
    );
  }
}

