# Research: 小老師助手系統

**Branch**: `001-little-teacher-helper` | **Date**: 2024-12-02

本文件記錄技術選型的研究結果，解決 Technical Context 中的所有待釐清項目。

---

## 1. Next.js 全端架構

### Decision
採用 Next.js 14+ App Router 作為全端框架，同時處理前端介面和後端 API。

### Rationale
- **單一程式碼庫**: 減少部署複雜度，符合 Occam's Razor 原則
- **Server Components**: 減少客戶端 JavaScript，提升首次載入效能
- **API Routes**: 內建的後端端點，無需額外設置
- **TypeScript 原生支援**: 符合 Constitution 的 TS 生態統一原則
- **PWA 整合**: `next-pwa` 套件成熟穩定

### Alternatives Considered
| 方案 | 優點 | 缺點 | 排除原因 |
|------|------|------|---------|
| Vite + Express 分離 | 更靈活 | 需管理兩個專案 | 違反 KISS 原則 |
| Remix | 類似 Next.js | 社群較小，PWA 支援較弱 | 生態系不如 Next.js 成熟 |
| SvelteKit | 效能佳 | 非 React 生態 | 團隊熟悉度考量 |

---

## 2. PWA 離線支援策略

### Decision
使用 `next-pwa` 套件搭配 Workbox，實作 Service Worker 離線快取。

### Rationale
- **next-pwa**: 專為 Next.js 設計，零設定整合
- **Workbox**: Google 維護，穩定可靠的離線策略實作
- **快取策略**: 
  - 靜態資源: Cache First
  - API 資料: Network First with Cache Fallback
  - 離線頁面: 預快取關鍵頁面

### Implementation Details
```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },
  ],
});
```

### iOS Safari 注意事項
- iOS 不支援 Background Sync API
- 需使用 visibilitychange 事件觸發同步
- PWA 在 iOS 上的 localStorage 限額約 50MB

---

## 3. QRCode 技術選型

### Decision
- **產生**: `qrcode` 套件 (npm: qrcode)
- **掃描**: `html5-qrcode` 套件 (npm: html5-qrcode)

### Rationale
| 套件 | 用途 | 大小 | 優點 |
|------|------|------|------|
| qrcode | 產生 QRCode | ~23KB | 支援 SVG/Canvas，可自訂樣式 |
| html5-qrcode | 掃描 QRCode | ~180KB | 跨瀏覽器相容，支援相機切換 |

### Alternatives Considered
- `react-qr-code`: 僅產生，功能較單純
- `@zxing/browser`: 掃描功能完整但較大 (~400KB)
- `jsQR`: 需手動處理相機串流

### QRCode 內容格式
```
URL: https://{domain}/join/{roomCode}
roomCode: 6 位英數字 (Base36)
範例: https://helper.school.edu/join/ABC123
```

---

## 4. 離線資料同步方案

### Decision
採用 localStorage 搭配操作佇列，實作樂觀更新 (Optimistic Update) 策略。

### Rationale
- **簡單實作**: 不需要 IndexedDB 的複雜度
- **容量足夠**: 40 學生 × 10 項目 × 100 bytes ≈ 40KB，遠低於 5MB 限額
- **樂觀更新**: 提升使用者體驗，操作立即反映

### 同步架構
```
┌─────────────────────────────────────────────────┐
│                   Client                         │
├─────────────────────────────────────────────────┤
│  UI State ←── useSubmissions() ←── LocalStorage │
│      │                                 ↑         │
│      └── 操作 ────→ OfflineQueue ─────┘         │
│                          │                       │
│                          ↓ (有網路時)            │
│                     Sync Service                 │
│                          │                       │
└──────────────────────────│───────────────────────┘
                           ↓
                      API Server
                           ↓
                       Database
```

### 衝突解決策略
- **Last-Writer-Wins (LWW)**: 以 `updatedAt` 時間戳記為準
- **衝突提示**: 若偵測到本地與伺服器版本不同，提示使用者
- **簡化設計**: 繳交狀態僅有「已交/未交」，衝突影響極小

---

## 5. 資料庫選擇

### Decision
- **MVP 階段**: SQLite (via Prisma)
- **生產環境**: PostgreSQL (Prisma 無縫遷移)

### Rationale
| 階段 | 資料庫 | 原因 |
|------|--------|------|
| MVP | SQLite | 零設定、檔案型、本地開發友善 |
| 生產 | PostgreSQL | 穩定、可擴展、Vercel/Railway 支援佳 |

### Prisma 優勢
- 型別安全的查詢
- 自動產生 TypeScript 型別
- 簡易的資料庫遷移
- 多資料庫支援 (SQLite → PostgreSQL 僅需改設定)

---

## 6. UI 框架與樣式

### Decision
採用 Tailwind CSS，視需要搭配 shadcn/ui 元件。

### Rationale
- **Tailwind CSS**: 
  - 原子化 CSS，快速開發
  - Next.js 內建支援
  - 無需額外 CSS-in-JS 執行時間開銷
- **shadcn/ui** (可選):
  - 複製貼上式元件，不增加依賴
  - 高品質 accessible 元件
  - 可完全自訂樣式

### 平板優化重點
- 最小觸控目標: 44×44px
- 大型按鈕和 checkbox
- 清晰的視覺回饋
- 簡化的導航結構

---

## 7. 部署策略

### Decision
推薦 Vercel 部署，SQLite 轉 PostgreSQL。

### Rationale
- **Vercel**: Next.js 官方支援，零設定部署
- **PostgreSQL**: Vercel Postgres 或 Railway/Supabase

### 部署流程
```
1. 本地開發: SQLite + npm run dev
2. 預覽環境: Vercel Preview + SQLite (CI/CD)
3. 生產環境: Vercel Production + PostgreSQL
```

### 環境變數
```env
DATABASE_URL="file:./dev.db"           # 開發環境
DATABASE_URL="postgresql://..."         # 生產環境
NEXT_PUBLIC_APP_URL="https://..."       # QRCode 產生用
```

---

## 8. 效能目標驗證

### 規格需求 vs 技術方案

| 成功標準 | 目標 | 技術方案 | 可行性 |
|----------|------|---------|--------|
| SC-001: QRCode 到開始登記 < 10 秒 | 10s | QRCode 解析 < 1s，頁面載入 < 3s | ✅ 可達成 |
| SC-002: 單次登記 < 2 秒 | 2s | 樂觀更新，即時反映 | ✅ 可達成 |
| SC-004: 離線回應 < 1 秒 | 1s | localStorage 讀寫 < 10ms | ✅ 可達成 |
| SC-005: 同步 < 30 秒 | 30s | 批次 API，100 筆資料 < 5s | ✅ 可達成 |
| SC-008: 100 活躍房間 | 100 | PostgreSQL 輕鬆處理 | ✅ 可達成 |

---

## Summary

所有技術選型皆通過 Constitution 原則檢查，符合 MVP 優先、簡單性、TypeScript 統一的要求。Next.js 全端架構是最簡單且有效的解決方案。

