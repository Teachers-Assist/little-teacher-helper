import { student } from '@/db/schema';
import type { DB } from '@/lib/db';

// 學生批次寫入的共用底層（匯入 Excel 與建班時的整班名單皆走這裡）。
//
// D1 的硬性限制：單一查詢最多 100 個綁定參數。Student 每列會綁 7 個
// （id / name / seatNumber / roomId / isRemoved / createdAt / updatedAt —— 後三者
// 也是參數，因為時間戳與 boolean 由應用層寫入），故單一多列 INSERT 只要超過 14 列
// 就會被 D1 拒絕（線上 500；本機 libsql 上限是 32766，測不出來）。
//
// 解法：拆成每段 14 列的多個 INSERT，用 db.batch() 送出。D1 與 libsql 的 batch
// 都是單一 transaction，任一段失敗即整批回滾，仍維持 FR-022 的「全或無」語意。

const PARAMS_PER_ROW = 7;
const MAX_BOUND_PARAMS = 100;
export const MAX_ROWS_PER_STATEMENT = Math.floor(MAX_BOUND_PARAMS / PARAMS_PER_ROW); // 14

export interface NewStudentRow {
  name: string;
  seatNumber: number;
  roomId: string;
}

export function chunkRows<T>(rows: T[], size = MAX_ROWS_PER_STATEMENT): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

type StudentRow = typeof student.$inferSelect;

/** 全或無寫入一批學生，回傳建立的資料列。 */
export async function insertStudents(db: DB, rows: NewStudentRow[]): Promise<StudentRow[]> {
  const chunks = chunkRows(rows);
  const statements = chunks.map((chunk) => db.insert(student).values(chunk).returning());

  if (statements.length === 0) return [];
  if (statements.length === 1) return await statements[0];

  const results = await db.batch(
    statements as [(typeof statements)[number], ...(typeof statements)[number][]]
  );
  return results.flat() as StudentRow[];
}
