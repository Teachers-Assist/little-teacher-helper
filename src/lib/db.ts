import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

// 雙模式資料庫連線：
//  - 線上（Cloudflare Workers）：用 Cloudflare D1（SQLite 相容）+ Prisma driver adapter。
//  - 本機 next dev（純 Node）：回退原生 PrismaClient + DATABASE_URL(file:./dev.db)，不需 workerd。
//
// 取 D1 綁定一律用 **async 版** getCloudflareContext({ async: true })：Next 16 + opennextjs 下
// 同步版在 route handler 內取不到綁定會拋錯，若因此掉進原生 PrismaClient，會在 Workers 上呼叫
// fs → 「fs.readdir is not implemented」而 500。
//
// 因為取綁定是 async，route/lib 需在使用前 `const prisma = await getDb()` 取得真正的 client，
// 這樣 Prisma 的 PrismaPromise / $transaction([...]) 批次交易等語意才完全正確。

const d1Clients = new WeakMap<D1Database, PrismaClient>();
// 本機原生 client 以 globalThis 快取，避免 next dev HMR 重複建立連線。
const globalForPrisma = globalThis as unknown as { __localPrisma?: PrismaClient };

/**
 * 是否跑在 Cloudflare Workers runtime。
 * 用 Workers 專屬全域 `WebSocketPair`（Node 沒有）判斷——不依賴 process.env.NODE_ENV
 * （Workers runtime 未必有設，靠它會誤判成 dev → 原生 engine → fs.readdir 500）。
 */
function onCloudflareWorkers(): boolean {
  return typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined';
}

export async function getDb(): Promise<PrismaClient> {
  // 本機 next dev：直接用原生 SQLite，且「不呼叫」getCloudflareContext——因為 async 版會
  // 嘗試啟動 wrangler 的 workerd 平台代理，而本機 Windows 上 workerd 會崩潰（access violation）。
  if (!onCloudflareWorkers()) {
    if (!globalForPrisma.__localPrisma) {
      globalForPrisma.__localPrisma = new PrismaClient();
    }
    return globalForPrisma.__localPrisma;
  }

  // 線上（Cloudflare Workers）：用 async 版取得 D1 綁定並接上 Prisma adapter。
  const { env } = await getCloudflareContext({ async: true });
  const db = env?.DB;
  if (!db) {
    throw new Error('D1 binding "DB" 不存在：請確認 wrangler.jsonc 的 d1_databases 綁定。');
  }
  let client = d1Clients.get(db);
  if (!client) {
    client = new PrismaClient({ adapter: new PrismaD1(db) });
    d1Clients.set(db, client);
  }
  return client;
}

export default getDb;
