import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { teacher } from '@/db/schema';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;

    const found = await db.query.teacher.findFirst({
      where: eq(teacher.id, id),
      with: {
        rooms: {
          columns: { id: true, name: true, code: true },
        },
      },
    });

    if (!found) {
      return NextResponse.json(
        { error: '找不到該老師' },
        { status: 404 }
      );
    }

    return NextResponse.json(found);
  } catch (error) {
    console.error('Failed to get teacher:', error);
    return NextResponse.json(
      { error: '取得老師資訊失敗' },
      { status: 500 }
    );
  }
}
