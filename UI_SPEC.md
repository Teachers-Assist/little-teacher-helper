# UI Design Spec — 小老師助手

> 適用對象：未來維護此專案的 AI agent 或開發者。  
> 功能邏輯不在此文件範圍內；本文件只描述 UI 規範。

---

## 核心原則

**JSX 控制行為與結構，CSS 控制視覺外觀。**

所有顏色、間距、圓角、陰影等視覺屬性集中在 `src/styles/globals.css` 的 `@layer components` 區塊定義。React 元件只套用語意 class 名稱，不手寫原始 utility。這樣未來要大改視覺風格，只需修改 CSS，不需動 JSX。

---

## 風格概述

**平面 2D 插畫風**：thick black border（`border-2 border-black`）貫穿全站；卡片與按鈕有偏移陰影（`4px 4px 0 #000`），hover 時陰影縮小並位移，呈現可按壓的立體感。

## 色系 Token

顏色統一使用 `@theme` 定義的 token，禁止直接用 Tailwind 的 `violet-*`、`indigo-*`、`yellow-*` 等原始顏色 class。

| 用途 | 使用方式 | 十六進位參考 |
|------|---------|------------|
| 品牌主色（藍） | `primary-500 / primary-600` | `#3b82f6 / #2563eb` |
| 主色淡背景 | `primary-100` | `#dbeafe` |
| 強調色（黃） | `accent-400` | `#facc15` |
| 強調淡背景 | `accent-100 / accent-300` | `#fef9c3 / #fde047` |
| 卡片 / 分隔線 border | `border-2 border-black` | — |
| 頁面背景 | `bg-amber-50` / `.app-main` | `#fffbeb` |
| Logo 方塊 | `bg-accent-400 border-2 border-black` | — |
| 成功狀態 | `green-200 / green-900` | — |
| 警告狀態 | `accent-300 / slate-900` | — |
| 危險狀態 | `red-200 / red-900` | — |
| 主要文字 | `slate-900` | — |
| 次要文字 | `slate-500` | — |
| 輔助文字 | `slate-400` | — |

---

## `@layer components` 類別速查

這些 class 定義在 `src/styles/globals.css`。**不要**為對應的元素手寫等效的原始 utility，直接使用這些語意 class。

### 按鈕

```
.btn          基底（必搭配尺寸 + 顏色 class）
.btn-sm       小
.btn-md       中（預設）
.btn-lg       大
.btn-primary  品牌主色
.btn-secondary 綠色次要
.btn-outline  白底灰框
.btn-ghost    無框透明
.btn-danger   紅色危險操作
```

### 卡片

```
.card         標準卡片（p-5）
.card-sm      緊湊卡片（p-4）
.card-hover   可點擊卡片的懸停效果（搭配 .card 使用）
.card-title   卡片內標題（text-sm font-semibold text-slate-700 mb-3）
```

### 表單輸入

```
.input        標準輸入框（含 focus ring）
.input-lg     較大輸入框
```

### 徽章 / 狀態標籤

```
.badge        基底
.badge-md     中等尺寸
.badge-lg     大尺寸
.badge-success / .badge-warning / .badge-danger / .badge-info / .badge-neutral
```

### 導覽項目（側邊欄）

```
.nav-item        未選中狀態
.nav-item-active 選中狀態（搭配 .nav-item 使用）
```

### 頁面文字

```
.page-title    主標題（text-xl font-bold text-slate-900）
.page-subtitle 副標題（text-sm text-slate-500 mt-0.5）
```

### 特殊狀態容器

```
.empty-state   空白狀態容器（虛線圓框，置中）
.loading-icon  載入動畫圖示容器（pulse 效果）
```

---

## 版面結構

### Teacher 頁面（有側邊欄）

所有 `/teacher/*` 路由由 `src/app/teacher/layout.tsx` 自動套上側邊欄。頁面只需提供：

```tsx
export default function SomePage() {
  return (
    <>
      <div className="page-header">
        {/* 返回連結、頁面標題、右側操作按鈕 */}
      </div>
      <div className="page-body">
        {/* 主要內容 */}
      </div>
    </>
  );
}
```

- `page-header`：白底、下邊框、固定 padding
- `page-body`：頁面背景色、固定 padding
- 側邊欄寬度 220px，sticky，手機版自動隱藏

### Helper / Join 頁面（無側邊欄）

`/helper/*` 和 `/join/*` 使用傳統置中版面：

```tsx
export default function SomePage() {
  return (
    <>
      <header className="lp-header">
        <div className="lp-header-inner">
          {/* Logo、返回等 */}
        </div>
      </header>
      <main className="lp-body-narrow">
        {/* 主要內容，最寬 680px */}
      </main>
    </>
  );
}

// 寬版用 .lp-body（最寬 1100px）
```

---

## 圖示系統

使用 `@iconify/react` + `@iconify-json/lucide`，透過自訂 `Icon` 元件封裝。

### 使用方式

```tsx
import { Icon } from '@/components/ui/Icon';

<Icon name="lucide:layout-dashboard" size={18} className="text-primary-600" />
```

| prop | 說明 |
|------|------|
| `name` | `"lucide:<icon-name>"` 格式 |
| `size` | px，寬高相同，預設 18 |
| `className` | 可加顏色、margin 等 |

### 新增圖示

只需在 `src/lib/icons-setup.ts` 的 `USED_ICONS` 陣列加入名稱，其他不用動。

```ts
const USED_ICONS = [
  'layout-dashboard',
  // 在這裡加入新圖示名稱
] as const;
```

> 圖示名稱對照：https://icon-sets.iconify.design/lucide/

### 注意事項

- `Icon` 元件是 `'use client'`，在 Server Component 中使用時會成為 client 邊界
- 不要在 `Icon.tsx` 以外直接 import `@iconify/react`
- 不要用舊 API：`<Icon icon="lucide:name" width={18} />`（已棄用）

---

## React 元件

| 元件 | 主要 props | 備註 |
|------|-----------|------|
| `<Button>` | `variant`, `size`, `isLoading` | 視覺在 CSS，元件只組合 class |
| `<Card>` | `variant`, `size` | variant: `default/elevated/bordered` |
| `<CardHeader>` `<CardTitle>` `<CardContent>` `<CardFooter>` | — | Card 子元件 |
| `<StatusBadge>` | `variant`, `dot`, `size` | 同 badge-* 色系 |
| `<Icon>` | `name`, `size`, `className` | 見圖示系統章節 |

---

## 禁止事項

| 禁止 | 應改用 |
|------|-------|
| `bg-violet-*`, `bg-indigo-*`, `bg-yellow-*` | `bg-primary-*` 或 `bg-accent-*` token |
| 為按鈕手寫 `px-* py-* rounded-* bg-* border-*` | `<Button variant size>` |
| 為卡片手寫 `rounded-xl border bg-white p-*` | `<Card>` 或 `.card` / `.card-sm` |
| 為 input 手寫 border + focus ring | `.input` class |
| 在卡片 / 按鈕上加 `shadow-*` Tailwind utility | 陰影已在 CSS 元件層定義，不要額外加 |
| 在 `/teacher/*` 以外使用 `.page-header` / `.page-body` | 用 `.lp-header` / `.lp-body-narrow` |
| 直接 import `@iconify/react` | `import { Icon } from '@/components/ui/Icon'` |
| 用舊 Icon API `icon=` / `width=` props | `name=` / `size=` props |

---

## 檔案位置索引

| 用途 | 路徑 |
|------|------|
| 全域樣式 + component layer | `src/styles/globals.css` |
| 色彩 token（Tailwind v4 `@theme`） | `src/styles/globals.css` 頂部 |
| 圖示白名單 + 初始化 | `src/lib/icons-setup.ts` |
| Icon 元件 | `src/components/ui/Icon.tsx` |
| Button 元件 | `src/components/ui/Button.tsx` |
| Card 元件 | `src/components/ui/Card.tsx` |
| Teacher 側邊欄 | `src/components/layout/TeacherSidebar.tsx` |
| Teacher layout | `src/app/teacher/layout.tsx` |
