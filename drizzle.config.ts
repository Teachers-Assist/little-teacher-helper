import { defineConfig } from 'drizzle-kit';

// drizzle-kit 設定（本機開發用）。
//  - db:push / db:studio 直接作用於本機 SQLite 檔（./local.db）。
//  - db:generate 產生的 migration SQL 輸出到 migrations/，可交由 wrangler d1 migrations apply
//    套用到 Cloudflare D1（D1 與 SQLite 相容）。
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./local.db',
  },
});
