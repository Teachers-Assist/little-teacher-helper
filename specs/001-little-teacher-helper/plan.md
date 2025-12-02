# Implementation Plan: 小老師助手系統

**Branch**: `001-little-teacher-helper` | **Date**: 2024-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-little-teacher-helper/spec.md`

## Summary

建立一個讓小老師幫忙收回條和登記作業繳交狀況的 PWA 應用程式。使用 Next.js 作為全端框架，實現 QRCode 加入房間機制、離線操作支援、以及報表產生功能。系統以平板為主要使用裝置，強調無需登入的便捷體驗。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 14+ (App Router), Prisma ORM, next-pwa, qrcode, html5-qrcode
**Storage**: SQLite (開發/MVP) → PostgreSQL (生產環境)
**Testing**: Vitest + React Testing Library
**Target Platform**: PWA (平板優先響應式設計，iOS Safari / Chrome)
**Project Type**: Web application (Next.js 全端)
**Performance Goals**: 
  - 頁面載入 < 3 秒
  - 離線操作回應 < 1 秒
  - 支援 100 個同時活躍房間
**Constraints**: 
  - 離線優先 (Offline-first)
  - 無需使用者登入（小老師端）
  - 平板觸控友善
**Scale/Scope**: 
  - MVP: 單一學校，100 間房間，40 學生/房間
  - 預估 4,000 學生記錄

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. MVP-First | 聚焦核心功能：建立房間、QRCode 加入、登記繳交、報表查看。延後進階功能（匯出格式、多項目管理）| ✅ |
| II. Occam's Razor | Next.js 單一框架處理前後端，避免分離部署複雜度。SQLite 作為 MVP 資料庫，簡化設置 | ✅ |
| III. KISS | 簡單的資料模型（5 個實體），扁平的路由結構，localStorage 實現離線暫存 | ✅ |
| IV. TS Ecosystem | 全程使用 TypeScript，Next.js + Prisma 皆為 TS 原生支援 | ✅ |
| V. User-Centric | 直接解決老師痛點：下課時間被佔用。小老師無需登入，一掃即用 | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/001-little-teacher-helper/
├── plan.md              # 本檔案
├── research.md          # Phase 0: 技術研究
├── data-model.md        # Phase 1: 資料模型
├── quickstart.md        # Phase 1: 快速開始指南
├── contracts/           # Phase 1: API 合約
│   └── openapi.yaml
└── tasks.md             # Phase 2: 任務分解 (由 /speckit.tasks 建立)
```

### Source Code (repository root)

```text
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # 根 Layout (PWA meta tags)
│   ├── page.tsx              # 首頁/進入點
│   ├── teacher/              # 老師端頁面
│   │   ├── page.tsx          # 老師儀表板
│   │   ├── rooms/
│   │   │   ├── page.tsx      # 房間列表
│   │   │   ├── new/page.tsx  # 建立房間
│   │   │   └── [id]/
│   │   │       ├── page.tsx  # 房間詳情/報表
│   │   │       └── qrcode/page.tsx  # QRCode 顯示
│   │   └── items/
│   │       └── [roomId]/page.tsx  # 管理登記項目
│   ├── join/
│   │   └── [code]/page.tsx   # 小老師掃碼加入頁面
│   ├── helper/               # 小老師端頁面
│   │   └── [roomId]/
│   │       ├── page.tsx      # 選擇登記項目
│   │       └── [itemId]/page.tsx  # 登記介面
│   └── api/                  # API Routes
│       ├── rooms/
│       │   ├── route.ts      # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts  # GET, PATCH, DELETE
│       │       └── students/route.ts  # GET, POST
│       ├── items/
│       │   └── [roomId]/route.ts  # CRUD 登記項目
│       ├── submissions/
│       │   └── route.ts      # GET, POST, PATCH (含批次同步)
│       └── sync/
│           └── route.ts      # 離線資料同步端點
├── components/
│   ├── ui/                   # 基礎 UI 元件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Checkbox.tsx
│   │   └── StatusBadge.tsx
│   ├── QRCodeDisplay.tsx     # QRCode 顯示元件
│   ├── QRScanner.tsx         # QRCode 掃描元件
│   ├── StudentList.tsx       # 學生列表 (含繳交狀態)
│   ├── SubmissionForm.tsx    # 登記表單
│   ├── ReportView.tsx        # 報表顯示
│   ├── NetworkStatus.tsx     # 網路狀態指示器
│   └── SyncIndicator.tsx     # 同步狀態指示器
├── lib/
│   ├── db.ts                 # Prisma client
│   ├── offline/
│   │   ├── storage.ts        # localStorage 封裝
│   │   ├── sync.ts           # 同步邏輯
│   │   └── queue.ts          # 離線操作佇列
│   ├── qrcode.ts             # QRCode 產生/解析
│   └── utils.ts              # 通用工具函式
├── hooks/
│   ├── useNetworkStatus.ts   # 網路狀態 hook
│   ├── useOfflineSync.ts     # 離線同步 hook
│   └── useRoom.ts            # 房間資料 hook
├── types/
│   └── index.ts              # 共用型別定義
└── styles/
    └── globals.css           # 全域樣式 (Tailwind)

prisma/
├── schema.prisma             # 資料庫 schema
└── migrations/               # 資料庫遷移

public/
├── manifest.json             # PWA manifest
├── sw.js                     # Service Worker (next-pwa 產生)
└── icons/                    # PWA 圖示

tests/
├── unit/
│   ├── lib/
│   └── components/
├── integration/
│   └── api/
└── e2e/                      # Playwright E2E 測試 (可選)
```

**Structure Decision**: 採用 Next.js App Router 單一專案結構，前後端共存於同一程式碼庫。這符合 Constitution 的簡單性原則，且 Next.js 14 的 Server Components 可實現良好的效能優化。

## Complexity Tracking

> 本專案符合所有 Constitution 原則，無需記錄違規項目。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |

## Implementation Recommendations

### 建議採用的技術方案

1. **PWA 離線支援**: 使用 `next-pwa` 套件，自動產生 Service Worker，配合 Workbox 策略實現離線快取

2. **QRCode 功能**:
   - 產生: `qrcode` 套件 (輕量、支援 SVG/Canvas)
   - 掃描: `html5-qrcode` 套件 (支援多種裝置相機)

3. **離線資料同步**:
   - 使用 localStorage 暫存待同步資料
   - 實作簡單的版本向量或時間戳記衝突解決
   - 網路恢復時自動嘗試同步

4. **資料庫選擇**:
   - MVP 階段: SQLite (Prisma 支援，零設定)
   - 生產環境: PostgreSQL (可無縫遷移)

5. **UI 框架**:
   - Tailwind CSS (原子化 CSS，快速開發)
   - 可選: shadcn/ui (高品質元件庫，不增加依賴)

### 技術風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|---------|
| PWA 在 iOS Safari 的限制 | 部分 PWA 功能受限 | 優先測試 Safari，確保核心功能正常 |
| 離線同步衝突 | 資料不一致 | 採用「最後更新優先」策略，UI 顯示衝突提示 |
| QRCode 掃描相容性 | 部分裝置無法掃描 | 提供手動輸入房間代碼的備援方案 |
