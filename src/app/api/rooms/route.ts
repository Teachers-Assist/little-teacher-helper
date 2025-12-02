import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateRoomCode } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacherId 為必填參數' },
        { status: 400 }
      );
    }

    const rooms = await prisma.room.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: {
            students: true,
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
    return NextResponse.json(
      { error: '取得房間列表失敗' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, teacherId } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '房間名稱為必填欄位' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: '房間名稱長度不可超過 100 字元' },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacherId 為必填欄位' },
        { status: 400 }
      );
    }

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      return NextResponse.json(
        { error: '無法產生唯一房間代碼，請稍後再試' },
        { status: 500 }
      );
    }

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        code,
        teacherId,
      },
      include: {
        _count: {
          select: {
            students: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json(
      { error: '建立房間失敗' },
      { status: 500 }
    );
  }
}

