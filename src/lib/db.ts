import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import { schema } from '@/db/schema';

// 統一資料庫連線：兩種環境、同一套 Drizzle 查詢 API（型別皆為 DB）。
//  - 線上（Cloudflare Workers）：drizzle-orm/d1 直接綁 D1。Worker bundle 只含 drizzle-orm
//    （極小），不再有 Prisma 的 query-engine wasm（原本 ~2.1 MiB，是超過免費方案 3 MiB 的主因）。
//  - 本機 next dev（純 Node）：drizzle-orm/libsql 讀本機 SQLite 檔（沿用既有 prisma/dev.db）。
//    libsql 有 Windows 預編譯二進位，不需 node-gyp，避開本機原生 SQLite 編譯失敗的老問題。
//
// 用 WebSocketPair（Workers 專屬全域、Node 沒有）判斷環境。libsql 只在非 Workers 分支動態
// 載入，故不會進入 Worker bundle。

export type DB = DrizzleD1Database<typeof schema>;

function onCloudflareWorkers(): boolean {
  return typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined';
}

const d1Instances = new WeakMap<D1Database, DB>();
// 本機 client 以 globalThis 快取，避免 next dev HMR 重複建立連線。
const globalForDb = globalThis as unknown as { __localDb?: DB };

export async function getDb(): Promise<DB> {
  // 本機 next dev：libsql + 本機 SQLite 檔
  if (!onCloudflareWorkers()) {
    if (!globalForDb.__localDb) {
      const { drizzle: drizzleLibsql } = await import('drizzle-orm/libsql');
      const { createClient } = await import('@libsql/client');
      const url = process.env.DATABASE_URL?.startsWith('file:')
        ? process.env.DATABASE_URL
        : 'file:./prisma/dev.db';
      const client = createClient({ url });
      // libsql 與 D1 的查詢 API 相同（皆為 async SQLite）；型別統一對外呈現為 DB。
      globalForDb.__localDb = drizzleLibsql(client, { schema }) as unknown as DB;
    }
    return globalForDb.__localDb;
  }

  // 線上 Workers：drizzle-orm/d1
  const { env } = await getCloudflareContext({ async: true });
  const d1 = env?.DB as D1Database | undefined;
  if (!d1) {
    throw new Error('D1 binding "DB" 不存在：請確認 wrangler.jsonc 的 d1_databases 綁定。');
  }
  let db = d1Instances.get(d1);
  if (!db) {
    db = drizzleD1(d1, { schema });
    d1Instances.set(d1, db);
  }
  return db;
}

export default getDb;

/**
 * 是否為 SQLite 唯一約束違反（取代 Prisma 的 P2002 判斷）。
 *
 * Drizzle 會把底層錯誤包一層（頂層 message 是 "Failed query: ..."），真正的
 * "UNIQUE constraint failed" 落在 .cause 鏈中；libsql 另帶結構化 code
 * （SQLITE_CONSTRAINT / SQLITE_CONSTRAINT_UNIQUE）。D1 則多半在頂層 message 直接含
 * "UNIQUE constraint failed"。故逐層走訪 cause，訊息與 code 皆比對。
 */
export function isUniqueConstraintError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let e: unknown = error;
  while (e && typeof e === 'object' && !seen.has(e)) {
    seen.add(e);
    const o = e as { message?: unknown; code?: unknown; extendedCode?: unknown; cause?: unknown };
    if (typeof o.message === 'string' && /UNIQUE constraint failed/i.test(o.message)) return true;
    if (o.code === 'SQLITE_CONSTRAINT' || o.code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
    if (o.extendedCode === 'SQLITE_CONSTRAINT_UNIQUE') return true;
    e = o.cause;
  }
  return false;
}
