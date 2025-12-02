# Quickstart Guide: 小老師助手系統

**Branch**: `001-little-teacher-helper` | **Date**: 2024-12-02

本指南說明如何快速設置開發環境並開始開發。

---

## 前置需求

| 工具 | 版本 | 安裝指令 |
|------|------|---------|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| pnpm | 8.x+ | `npm install -g pnpm` |
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
# 資料庫 (MVP 使用 SQLite)
DATABASE_URL="file:./dev.db"

# 應用程式 URL (用於 QRCode 產生)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 開發模式
NODE_ENV="development"
```

### 4. 初始化資料庫

```bash
# 產生 Prisma Client
pnpm prisma generate

# 執行資料庫遷移
pnpm prisma migrate dev --name init

# (選用) 開啟 Prisma Studio 查看資料
pnpm prisma studio
```

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
│   ├── app/           # Next.js App Router 頁面
│   ├── components/    # React 元件
│   ├── lib/           # 共用函式庫
│   ├── hooks/         # React Hooks
│   └── types/         # TypeScript 型別
├── prisma/
│   └── schema.prisma  # 資料庫 Schema
├── public/            # 靜態資源
├── specs/             # 功能規格文件
└── tests/             # 測試檔案
```

---

## 開發指令

| 指令 | 說明 |
|------|------|
| `pnpm dev` | 啟動開發伺服器 |
| `pnpm build` | 建置生產版本 |
| `pnpm start` | 啟動生產伺服器 |
| `pnpm lint` | 執行 ESLint 檢查 |
| `pnpm test` | 執行測試 |
| `pnpm prisma studio` | 開啟資料庫管理介面 |
| `pnpm prisma migrate dev` | 執行資料庫遷移 |

---

## 核心功能開發指南

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
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  const rooms = await prisma.room.findMany({
    where: { teacherId: teacherId || undefined },
  });

  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  const room = await prisma.room.create({
    data: {
      name: body.name,
      code: generateRoomCode(), // 產生 6 位代碼
      teacherId: body.teacherId,
    },
  });

  return NextResponse.json(room, { status: 201 });
}
```

### 使用 Prisma 查詢資料

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

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

### Vercel 部署 (推薦)

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 環境變數設定

在 Vercel Dashboard 設定：

| 變數名稱 | 說明 |
|----------|------|
| `DATABASE_URL` | PostgreSQL 連接字串 |
| `NEXT_PUBLIC_APP_URL` | 生產環境網址 |

---

## 常見問題

### Q: Prisma 無法連接資料庫

```bash
# 重新產生 Prisma Client
pnpm prisma generate

# 重置資料庫
pnpm prisma migrate reset
```

### Q: 熱重載不工作

```bash
# 刪除 .next 資料夾
rm -rf .next
pnpm dev
```

### Q: TypeScript 型別錯誤

```bash
# 重新產生 Prisma 型別
pnpm prisma generate

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
- [Prisma 文件](https://www.prisma.io/docs)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)
- [PWA with Next.js](https://github.com/shadowwalker/next-pwa)

