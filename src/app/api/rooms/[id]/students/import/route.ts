import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 學生 Excel 批次匯入的「後端」endpoint（002 US1）。
// 前端已完成格式驗證與檔案內衝突偵測，此處只收乾淨 JSON，負責：
//   1. 防禦性重新驗證（座號範圍、姓名長度、檔案內重複）
//   2. 與既有資料的衝突偵測（座號 / 姓名，含已移除學生 —— unique 約束涵蓋）
//   3. 全或無原子寫入（FR-022）：任一衝突即整批拒絕並回傳逐列原因
//
// 回應：
//   201 { created, students }                         成功
//   409 { conflicts: [{ rowNumber, field, code }] }   有衝突，未寫入
//   400 { error }                                     請求格式錯誤

const P = 'teacher.studentList.importErrors';
const MAX_IMPORT = 100;

interface ImportRow {
  rowNumber: number;
  seatNumber: number;
  name: string;
}

interface Conflict {
  rowNumber: number;
  field: 'seat' | 'name' | null;
  code: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roomId } = await params;
    const body = await request.json();
    const incoming = (body?.students ?? []) as ImportRow[];

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: `${P}.noRows` }, { status: 400 });
    }
    if (incoming.length > MAX_IMPORT) {
      return NextResponse.json({ error: `${P}.tooMany` }, { status: 400 });
    }

    const conflicts: Conflict[] = [];

    // 1. 防禦性逐列驗證
    for (const row of incoming) {
      const rowNumber = Number(row?.rowNumber) || 0;
      if (
        !Number.isInteger(row?.seatNumber) ||
        row.seatNumber < 1 ||
        row.seatNumber > 99
      ) {
        conflicts.push({ rowNumber, field: 'seat', code: `${P}.seatOutOfRange` });
      }
      const name = typeof row?.name === 'string' ? row.name.trim() : '';
      if (name.length === 0) {
        conflicts.push({ rowNumber, field: 'name', code: `${P}.nameRequired` });
      } else if (name.length > 50) {
        conflicts.push({ rowNumber, field: 'name', code: `${P}.nameTooLong` });
      }
    }

    // 2. 檔案內重複（防禦性）
    const seenSeat = new Map<number, number>();
    const seenName = new Map<string, number>();
    for (const row of incoming) {
      if (seenSeat.has(row.seatNumber)) {
        conflicts.push({ rowNumber: row.rowNumber, field: 'seat', code: `${P}.seatDupInFile` });
      } else {
        seenSeat.set(row.seatNumber, row.rowNumber);
      }
      const name = typeof row?.name === 'string' ? row.name.trim() : '';
      if (name && seenName.has(name)) {
        conflicts.push({ rowNumber: row.rowNumber, field: 'name', code: `${P}.nameDupInFile` });
      } else if (name) {
        seenName.set(name, row.rowNumber);
      }
    }

    // 3. 與既有資料衝突。座號 unique 約束涵蓋已移除學生，故座號比對全體；
    //    姓名僅與「現有（未移除）」學生比對。
    const existing = await prisma.student.findMany({
      where: { roomId },
      select: { seatNumber: true, name: true, isRemoved: true },
    });
    const existingSeats = new Set(existing.map((s) => s.seatNumber));
    const existingActiveNames = new Set(
      existing.filter((s) => !s.isRemoved).map((s) => s.name)
    );

    for (const row of incoming) {
      if (existingSeats.has(row.seatNumber)) {
        conflicts.push({ rowNumber: row.rowNumber, field: 'seat', code: `${P}.seatDupExisting` });
      }
      const name = typeof row?.name === 'string' ? row.name.trim() : '';
      if (name && existingActiveNames.has(name)) {
        conflicts.push({ rowNumber: row.rowNumber, field: 'name', code: `${P}.nameDupExisting` });
      }
    }

    if (conflicts.length > 0) {
      conflicts.sort((a, b) => a.rowNumber - b.rowNumber);
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    // 4. 全或無原子寫入
    const created = await prisma.$transaction(
      incoming.map((row) =>
        prisma.student.create({
          data: { name: row.name.trim(), seatNumber: row.seatNumber, roomId },
        })
      )
    );

    return NextResponse.json({ created: created.length, students: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to import students:', error);
    return NextResponse.json({ error: 'common.error' }, { status: 500 });
  }
}
