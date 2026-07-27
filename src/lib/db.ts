import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

// 雙模式資料庫連線：
//  - 線上（Cloudflare Workers）：沒有持久檔案系統，改用 Cloudflare D1（SQLite 相容）
//    透過 Prisma driver adapter 連線。D1 binding（env.DB）只有請求進來時才拿得到，
//    故以 Proxy 延遲解析、並依 binding 快取 client。
//  - 本機開發（next dev，純 Node）：getCloudflareContext() 取不到綁定會丟例外，
//    此時回退到原生 PrismaClient + DATABASE_URL(file:./dev.db)，完全不需 workerd。
//
// 兩種模式下 route 都維持原本 `import prisma from '@/lib/db'`、`prisma.model.method()` 寫法。

const d1Clients = new WeakMap<D1Database, PrismaClient>();

// 本機原生 client 以 globalThis 快取，避免 next dev HMR 重複建立連線。
const globalForPrisma = globalThis as unknown as { __localPrisma?: PrismaClient };

function getClient(): PrismaClient {
  // 先嘗試取得 Cloudflare D1 綁定（線上／有綁定的環境）
  try {
    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (db) {
      let client = d1Clients.get(db);
      if (!client) {
        client = new PrismaClient({ adapter: new PrismaD1(db) });
        d1Clients.set(db, client);
      }
      return client;
    }
  } catch {
    // 純 Node 的 next dev 下 getCloudflareContext() 會丟例外 → 落到本機 SQLite
  }

  // 本機開發：原生 Prisma（讀 DATABASE_URL，預設 file:./dev.db）
  if (!globalForPrisma.__localPrisma) {
    globalForPrisma.__localPrisma = new PrismaClient();
  }
  return globalForPrisma.__localPrisma;
}

// 對外仍以 `prisma` 之名匯出；每次屬性存取都解析到當前環境對應的 client。
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prisma;
