# Quickstart Guide: 小老師助手系統

**Branch**: `001-little-teacher-helper` | **Date**: 2024-12-02 | **Updated**: 2026-07-28（資料層改 Drizzle ORM + Cloudflare D1，取代 Prisma；部署改 Cloudflare Workers）

本指南說明如何快速設置開發環境並開始開發。

> **資料層現況（2026-07）**：ORM 為 **Drizzle**（非 Prisma）。線上資料庫為 **Cloudflare D1**，本機開發用 **libsql** 讀本機 SQLite 檔（`prisma/dev.db`，資料夾名沿用）。部署走 **OpenNext + Cloudflare Workers**（非 Vercel）。schema 單一真實來源為 `src/db/schema.ts`。

---

## 前置需求

| 工具 | 版本 | 安裝指令 |
|------|------|---------|
| Node.js | 22.x LTS | [nodejs.org](https://nodejs.org/) |
| pnpm | 9.x+ | `npm install -g pnpm` |
| Git | 2.x+ | 系統內建或 [git-scm.com](https://git-scm.com/) |

---

## 快速開始

### 1. Clone 專案並切換分支

```bash
git clone <repository-url>
cd little-teacher-helper
git checkout 001-little-teacher-helper
```

### 2. 安裝依賴

```bash
pnpm install
```

### 3. 環境設定

建立 `.env.local` 檔案：

```bash
cp .env.example .env.local
```

編輯 `.env.local`：

```env
# 本機開發資料庫（libsql 讀本機 SQLite 檔，相對於專案根目錄）
DATABASE_URL="file:./prisma/dev.db"

# 應用程式 URL (用於 QRCode 產生)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 開發模式
NODE_ENV="development"
```

### 4. 初始化資料庫

本機開發直接用 Drizzle 把 schema 同步到本機 SQLite 檔（`prisma/dev.db`）：

```bash
# 依 src/db/schema.ts 建立 / 更新本機資料表
pnpm db:push

# (選用) 開啟 Drizzle Studio 查看資料
pnpm db:studio
```

> **線上 D1** 不走 `db:push`，改用 wrangler 套用 `migrations/` 內的 SQL：
> ```bash
> pnpm db:migrate:remote   # wrangler d1 migrations apply --remote
> ```
> 改動 schema 後用 `pnpm db:generate` 產生新的 migration SQL 到 `migrations/`，再 apply。

### 5. 啟動開發伺服器

```bash
pnpm dev
```

開啟瀏覽器訪問: http://localhost:3000

---

## 專案結構概覽

```
.
├── src/
│   ├── app/           # Next.js App Router 頁面 + API routes
│   ├── components/    # React 元件
│   ├── db/
│   │   └── schema.ts  # Drizzle schema（資料模型單一真實來源）
│   ├── lib/
│   │   └── db.ts      # getDb()：線上 D1 / 本機 libsql 雙 driver
│   ├── hooks/         # React Hooks
│   └── types/         # TypeScript 型別
├── migrations/        # D1 遷移 SQL（wrangler d1 migrations apply 讀這裡）
├── prisma/
│   └── dev.db         # 本機開發用 SQLite 資料檔（資料夾名沿用；Prisma 已移除）
├── drizzle.config.ts  # drizzle-kit 設定（push / studio / generate）
├── wrangler.jsonc     # Cloudflare Workers + D1 綁定設定
├── public/            # 靜態資源
├── specs/             # 功能規格文件
└── tests/             # 測試檔案
```

---

## 開發指令

| 指令 | 說明 |
|------|------|
| `pnpm dev` | 啟動開發伺服器 |
| `pnpm build` | 建置生產版本（`next build`） |
| `pnpm start` | 啟動生產伺服器 |
| `pnpm lint` | 執行 ESLint 檢查 |
| `pnpm test` | 執行測試（vitest） |
| `pnpm db:push` | 依 schema 更新本機 SQLite 資料表 |
| `pnpm db:studio` | 開啟 Drizzle Studio 資料庫管理介面 |
| `pnpm db:generate` | 依 schema 產生 migration SQL 到 `migrations/` |
| `pnpm db:migrate:remote` | 套用 migrations 到線上 D1（wrangler） |
| `pnpm deploy` | 建置並部署到 Cloudflare Workers（OpenNext） |

---

## 核心功能開發指南

### ⚠️ 開始寫元件前：建立 UI 文字檔

**所有對使用者顯示的文字（提示、警告、錯誤訊息、狀態說明、按鈕標籤）都必須定義在 `src/messages/zh-TW.ts`，元件內不得直接硬寫中文字串。**

原因：文字需要隨時調整語氣以符合學生年齡層，未來也可能支援多語言。集中管理才能快速全局調整。

```bash
mkdir -p src/messages
touch src/messages/zh-TW.ts
```

建議的檔案結構（依功能模組分組）：

```typescript
// src/messages/zh-TW.ts

export const messages = {
  common: {
    loading: '載入中...',
    saving: '儲存中...',
    syncing: '同步中...',
    saved: '已儲存',
    synced: '已同步',
    offline: '離線模式',
    pendingSync: '待同步',
    error: '發生錯誤，請稍後再試',
    confirm: '確認',
    cancel: '取消',
  },
  identity: {
    selectSeat: '請選擇你的座號',
    isAssigned: '你是本任務指定的小老師',
    notAssigned: '你不是本任務指定的小老師，仍可繼續登記',
    noAssignment: '',
    recordedAs: (seat: string) => `此次登記紀錄為：${seat} 號`,
  },
  task: {
    selectTask: '選擇要登記的任務',
    assignedToYou: '指定給你',
    markComplete: '標記登記完畢',
    markCompleteWarning: '標記後你將無法自行修改，如需更動須請老師重新開放。確定嗎？',
    completed: '登記完畢',
    lockedMessage: '此任務已完成，如需修改請告知老師重新開放',
  },
  record: {
    numberOnly: '這裡只能填數字',
    uploadingMessage: '正在上傳，老師和同學即將看得到',
  },
} as const;
```

在元件中使用：

```typescript
import { messages } from '@/messages/zh-TW';

// 在元件內
<p>{messages.identity.recordedAs(seatNumber)}</p>
<button>{messages.task.markComplete}</button>
```

新增文字時，先在 `zh-TW.ts` 加入對應的 key，再在元件中引用。不要直接在 JSX 裡寫中文。

---

### 建立新頁面

Next.js App Router 使用檔案系統路由：

```bash
# 建立老師儀表板頁面
touch src/app/teacher/page.tsx
```

```typescript
// src/app/teacher/page.tsx
export default function TeacherDashboard() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">老師儀表板</h1>
    </div>
  );
}
```

### 建立 API 端點

```bash
# 建立房間 API
touch src/app/api/rooms/route.ts
```

```typescript
// src/app/api/rooms/route.ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { room } from '@/db/schema';

export async function GET(request: Request) {
  const db = await getDb();
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  const rooms = teacherId
    ? await db.select().from(room).where(eq(room.teacherId, teacherId))
    : await db.select().from(room);

  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const db = await getDb();
  const body = await request.json();

  const [created] = await db
    .insert(room)
    .values({
      name: body.name,
      code: generateRoomCode(), // 產生 6 位代碼
      teacherId: body.teacherId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
```

> 注意：`getDb()` 是 **async**，每個 handler 開頭 `const db = await getDb();`。查詢用 Drizzle
> query builder（`db.select()...`）或關聯查詢（`db.query.room.findFirst({ with: {...} })`
> 取代 Prisma 的 `include`）。

### getDb() 如何取得連線（線上 D1 / 本機 libsql）

```typescript
// src/lib/db.ts（摘要）
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import { schema } from '@/db/schema';

export type DB = DrizzleD1Database<typeof schema>;

// 以 WebSocketPair（Workers 專屬全域）判斷環境：
//  - 線上 Workers → drizzle-orm/d1 綁 env.DB
//  - 本機 next dev → 動態載入 drizzle-orm/libsql 讀 file:./prisma/dev.db
export async function getDb(): Promise<DB> { /* ... */ }
```

> 完整實作見 `src/lib/db.ts`。schema 定義在 `src/db/schema.ts`。

### 實作離線儲存

```typescript
// src/lib/offline/storage.ts
const STORAGE_KEY = 'little-helper-offline-data';

export function getOfflineData(): OfflineData {
  if (typeof window === 'undefined') return createEmptyData();
  
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : createEmptyData();
}

export function saveOfflineData(data: OfflineData): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addToSyncQueue(operation: SyncOperation): void {
  const data = getOfflineData();
  data.syncQueue.push({
    ...operation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
  saveOfflineData(data);
}
```

---

## 測試

### 執行單元測試

```bash
pnpm test
```

### 測試 API 端點

```bash
# 使用 curl 測試
curl http://localhost:3000/api/rooms

# 或使用 httpie
http GET localhost:3000/api/rooms
```

---

## PWA 測試

### 本地 HTTPS 測試 (PWA 需要)

```bash
# 安裝 mkcert
brew install mkcert
mkcert -install
mkcert localhost

# 使用自簽憑證啟動
# (需要額外設定，建議在生產環境測試 PWA)
```

### 模擬離線

1. 開啟 Chrome DevTools
2. 切換到 Network 標籤
3. 勾選 "Offline" 選項
4. 測試離線功能

---

## 部署

### Cloudflare Workers 部署（OpenNext）

線上以 **OpenNext 打包成 Cloudflare Worker**、資料庫用 **D1**。日常部署由 Cloudflare 原生
Git 整合（Workers Builds）在 push 後自動於 Linux builder 執行；也可本機手動：

```bash
# 建置並部署（= opennextjs-cloudflare build && deploy）
pnpm deploy
```

> ⚠️ **Windows 注意**：`opennextjs-cloudflare build` 在 Windows 會 segfault，本機無法產出
> Worker bundle。請靠 Cloudflare 的 Linux CI 部署驗證（含 worker gzip size 是否在免費方案
> 3 MiB 上限內）。本機開發（`pnpm dev`）不受影響，走 libsql。

### 綁定與環境變數

D1 綁定寫在 `wrangler.jsonc`（`d1_databases` 的 `binding: "DB"`），程式端以
`getCloudflareContext().env.DB` 取得，**不經 `DATABASE_URL`**。`DATABASE_URL` 只在本機開發用。

| 設定 | 位置 | 說明 |
|----------|------|------|
| `DB`（D1 binding） | `wrangler.jsonc` | 線上資料庫，`database_id` 指向 Cloudflare D1 |
| `DATABASE_URL` | 本機 `.env.local` | 僅本機 libsql 用（`file:./prisma/dev.db`） |
| `NEXT_PUBLIC_APP_URL` | Cloudflare 專案環境變數 | 生產環境網址（QRCode 用） |

---

## 常見問題

### Q: 本機資料庫沒有資料表 / schema 對不上

```bash
# 依 src/db/schema.ts 重新同步本機 SQLite 資料表
pnpm db:push
```

### Q: 本機日期 / 布林值讀出來怪怪的

Drizzle schema 已對映既有資料的儲存慣例：**時間欄位為 INTEGER 毫秒**
（`mode: 'timestamp_ms'`）、**布林為 0/1**（`mode: 'boolean'`）。若新增欄位，時間 / 布林務必
沿用同樣 mode，否則會與既有資料不相容。詳見 `src/db/schema.ts` 開頭註解。

### Q: 熱重載不工作

```bash
# 刪除 .next 資料夾
rm -rf .next
pnpm dev
```

### Q: TypeScript 型別錯誤

```bash
# schema 型別由 src/db/schema.ts 直接推導，改完重啟 TS 服務即可
# 重啟 TypeScript 服務 (VS Code)
Cmd+Shift+P -> TypeScript: Restart TS Server
```

---

## 下一步

1. 閱讀 [spec.md](./spec.md) 了解功能需求
2. 閱讀 [data-model.md](./data-model.md) 了解資料結構
3. 參考 [contracts/openapi.yaml](./contracts/openapi.yaml) 實作 API
4. 執行 `/speckit.tasks` 產生任務清單

---

## 相關資源

- [Next.js 文件](https://nextjs.org/docs)
- [Drizzle ORM 文件](https://orm.drizzle.team/docs/overview)
- [Cloudflare D1 文件](https://developers.cloudflare.com/d1/)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)
- [PWA with Next.js](https://github.com/shadowwalker/next-pwa)

