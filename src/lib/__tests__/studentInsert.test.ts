import { describe, it, expect } from 'vitest';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { student } from '@/db/schema';
import type { DB } from '@/lib/db';
import { chunkRows, insertStudents, MAX_ROWS_PER_STATEMENT } from '@/lib/studentInsert';

// 這組測試守的是 D1 的硬限制：單一查詢最多 100 個綁定參數。
// 線上（D1）超過即整個請求 500；本機 libsql 上限遠高於此，測不出來，
// 故改以「檢查產生的 SQL 綁定參數量」來驗。

const D1_MAX_BOUND_PARAMS = 100;

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    name: `學生${i + 1}`,
    seatNumber: i + 1,
    roomId: 'room-1',
  }));

describe('chunkRows', () => {
  it('每段不超過 D1 單一 statement 可容納的列數', () => {
    for (const n of [1, 14, 15, 27, 50, 100]) {
      const chunks = chunkRows(rows(n));
      expect(chunks.every((c) => c.length <= MAX_ROWS_PER_STATEMENT)).toBe(true);
      expect(chunks.flat()).toHaveLength(n);
    }
  });

  it('空陣列不產生任何段', () => {
    expect(chunkRows(rows(0))).toEqual([]);
  });
});

describe('insertStudents', () => {
  // 用 sqlite-proxy 產生真正的 SQL，攔截每個 statement 檢查綁定參數量。
  const makeDb = () => {
    const statements: { sql: string; params: unknown[] }[] = [];
    const base = drizzle(async (sql, params) => {
      statements.push({ sql, params });
      return { rows: [] };
    });
    let batchCalls = 0;
    const db = {
      insert: base.insert.bind(base),
      batch: async (queries: { toSQL: () => { sql: string; params: unknown[] } }[]) => {
        batchCalls += 1;
        for (const q of queries) statements.push(q.toSQL());
        return queries.map(() => []);
      },
    } as unknown as DB;
    return { db, statements, getBatchCalls: () => batchCalls };
  };

  it('27 位學生：每個 statement 都在 D1 綁定參數上限內', async () => {
    const { db, statements } = makeDb();
    await insertStudents(db, rows(27));

    expect(statements.length).toBeGreaterThan(1);
    for (const s of statements) {
      expect(s.params.length).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    }
  });

  it('100 位學生（上限）同樣不超過綁定參數上限', async () => {
    const { db, statements } = makeDb();
    await insertStudents(db, rows(100));

    for (const s of statements) {
      expect(s.params.length).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    }
  });

  it('多段時只送出一次 batch —— 單一 transaction 才能維持全或無', async () => {
    const { db, getBatchCalls } = makeDb();
    await insertStudents(db, rows(27));
    expect(getBatchCalls()).toBe(1);
  });

  it('單段時不必動用 batch', async () => {
    const { db, getBatchCalls, statements } = makeDb();
    await insertStudents(db, rows(MAX_ROWS_PER_STATEMENT));
    expect(getBatchCalls()).toBe(0);
    expect(statements).toHaveLength(1);
  });

  it('寫入的欄位與列數與輸入一致', async () => {
    const { db, statements } = makeDb();
    await insertStudents(db, rows(20));

    const all = statements.map((s) => s.sql).join('\n');
    expect(all).toContain('insert into "Student"');
    const placeholderGroups = statements
      .map((s) => s.params.length / 7)
      .reduce((a, b) => a + b, 0);
    expect(placeholderGroups).toBe(20);
    expect(statements.flatMap((s) => s.params)).toContain('學生20');
  });
});

describe('schema 假設', () => {
  it('Student 每列剛好綁 7 個參數（欄位若增減，MAX_ROWS_PER_STATEMENT 需同步調整）', () => {
    const base = drizzle(async () => ({ rows: [] }));
    const q = base.insert(student).values(rows(1)).returning().toSQL();
    expect(q.params).toHaveLength(7);
    expect(MAX_ROWS_PER_STATEMENT).toBe(Math.floor(D1_MAX_BOUND_PARAMS / 7));
  });
});
