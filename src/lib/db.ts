import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';
import type { PrismaClient } from '@/generated/prisma/client';

// 雙模式資料庫連線（兩個 Prisma client，依環境動態載入）：
//  - 線上（Cloudflare Workers）：用新版 prisma-client generator 產生的 edge client
//    （src/generated/prisma，runtime=cloudflare，不含 query engine、不碰 fs）+ D1 adapter。
//    這才是解決 opennext 上 `fs.readdir is not implemented` 500 的正解。
//  - 本機 next dev（純 Node）：用傳統 @prisma/client（含原生 engine），直接連 file:./dev.db。
//    這樣本機不需 workerd、也不需編譯原生 SQLite 模組（那些在此 Windows 上都失敗）。
//
// 用 WebSocketPair（Workers 專屬全域、Node 沒有）判斷環境，不依賴 process.env.NODE_ENV。

const d1Clients = new WeakMap<D1Database, PrismaClient>();
// 本機原生 client 以 globalThis 快取，避免 next dev HMR 重複建立連線。
const globalForPrisma = globalThis as unknown as { __localPrisma?: PrismaClient };

function onCloudflareWorkers(): boolean {
  return typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined';
}

export async function getDb(): Promise<PrismaClient> {
  // 本機 next dev：傳統含引擎 client + 原生 SQLite
  if (!onCloudflareWorkers()) {
    if (!globalForPrisma.__localPrisma) {
      const { PrismaClient: NodePrismaClient } = await import('@prisma/client');
      globalForPrisma.__localPrisma = new NodePrismaClient() as unknown as PrismaClient;
    }
    return globalForPrisma.__localPrisma;
  }

  // 線上 Workers：edge client + D1 adapter（無引擎、無 fs）
  const { env } = await getCloudflareContext({ async: true });
  const db = env?.DB;
  if (!db) {
    throw new Error('D1 binding "DB" 不存在：請確認 wrangler.jsonc 的 d1_databases 綁定。');
  }
  let client = d1Clients.get(db);
  if (!client) {
    const { PrismaClient: EdgePrismaClient } = await import('@/generated/prisma/client');
    const { PrismaD1 } = await import('@prisma/adapter-d1');
    client = new EdgePrismaClient({ adapter: new PrismaD1(db) });
    d1Clients.set(db, client);
  }
  return client;
}

export default getDb;
