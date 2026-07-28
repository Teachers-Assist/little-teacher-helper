import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { teacher } from '@/db/schema';

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { name, email } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '名字為必填欄位' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: '名字長度不可超過 50 字元' },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(teacher)
      .values({ name: name.trim(), email: email?.trim() || null })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create teacher:', error);
    return NextResponse.json(
      { error: '建立老師失敗' },
      { status: 500 }
    );
  }
}
