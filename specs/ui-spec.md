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

### 統計小卡

```
.stat-tile        容器：大數字 + 圖示標籤，水平排列省垂直空間（比 card-sm 矮）
.stat-tile-value  數值（text-xl → sm:text-2xl、font-bold；顏色由 tone 控制）
.stat-tile-label  標籤（text-xs、slate-500 次要文字 + 圖示）
```

> 對應 `<StatTile>` 元件，供 Dashboard（`DashboardStats`）與班級狀況（`MonitoringStats`）統計列共用。

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
.nav-subitem     子層導覽（「我的班級」展開的班級清單；較 nav-item 小一號、slate-700 font-medium）
```

### 頁面文字

```
.page-title    主標題（text-xl font-bold text-slate-900）
.page-subtitle 副標題（text-sm text-slate-500 mt-0.5）
.link-back     返回連結（小型 icon + 文字，hover 轉主色；margin 等間距留在 JSX）
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
| `<StatTile>` | `label`, `value`, `icon`, `tone` | 統計小卡，視覺在 `.stat-tile*` |
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

## 互動模式判斷規則（002 新增，對應 NFR-006 / NFR-007）

決定「某個操作該用什麼互動模式」時，依下列規則，避免每個畫面各自發明做法：

1. **跨 tab 重複的內容上提共用**：同一畫面內若有多個 tab 共用的資訊（如班級資訊），MUST 抽到 **tab 列之上**共用一份，**不在每個 tab 的側欄各放一份**。（見 `/teacher/rooms/[id]` 班級資訊區塊）
2. **高頻 / 結構簡單的新增與編輯採側欄內嵌表單**：學生、任務的新增與編輯用**側欄 inline 表單 + 模式切換**（新增 ↔ 編輯，編輯時顯示「正在編輯：X」+「取消編輯」），**不採側拉面板或 modal**。（`StudentForm`、`TaskForm` 共用此樣式）
3. **可逆動作只需一層確認**：soft delete / 封存等可還原的動作只需**一層**確認對話框（`ConfirmDialog`）；硬刪除（若存在）才需兩層。
4. **進階 / 低頻 / 深入瀏覽可跳頁**：批次匯入、單一任務的完整結果（`/teacher/tasks/[roomId]/[taskId]`）等可採跳頁。
5. **modal 僅用於「展示 / 分享」例外，不用於編輯資料**：QRCode 投影分享採滿版 modal（`QRCodeModal`）是「展示」用途的例外，**不是**拿 modal 來編輯資料；資料編輯一律走規則 2 的內嵌表單。
6. **側欄是唯一導航中樞**：`/teacher/*`（dashboard 除外）的 page-header **不放「返回」連結**；跨頁 / 返回一律靠側欄。側欄含「儀表板」與可展開的「我的班級」清單。
7. **小螢幕（< 768px）用 hamburger 開側欄抽屜**：側欄自動收合，page 區頂部提供 `lucide:menu` 開抽屜，避免移除返回連結後無法導航。
8. **列表捲動發生在列表內、不是整個視窗**：班級詳情頁桌機（lg+）固定班級資訊 + tabs，**只有列表內部捲動**（app-shell：`.sidebar-layout` 固定視窗高、`.page-body` 內捲、`.room-detail-body` 控制列表內捲）。
9. **dashboard 雙視角**：依老師類型提供「按班級檢視 / 按任務檢視」雙 tab；預設 tab 依班級數而定（1 班 → 按任務；≥2 班 → 按班級），手動切換暫存於 sessionStorage（不持久化）。

---

## 進場儀式 / 自我聲明印章 / 兒童語氣文案規範（003 新增，對應 vision 第 4、7 節）

小老師端的進場與身份體驗有別於一般 CRUD 畫面，下列規範補足「儀式感」與「承諾裝置」的視覺要求。決定相關畫面做法時依此，避免削弱問責設計或讓兒童在同學面前卡住。

### 進場過場（`JoinTransition`）

1. `/join/[code]` 是**過場頁**不是狀態頁：歡迎畫面 1.5–2 秒**自動**進入選座號，**MUST NOT** 提供「跳過 / 進入」按鈕（避免下意識點過、失去儀式感）。
2. **班級名稱是畫面最大、最醒目的元素**（字級需大於歡迎語）；icon 用慶祝符號（`lucide:party-popper`）。
3. 計時器在 `useEffect` 卸載時 MUST cleanup，避免中途離開後重入卡住（Edge Case）。

### 自我聲明印章（`IdentityStamp`）

1. 選座號後 MUST 全螢幕亮出「我是 [座號] 號 [姓名]」停 1.5 秒，對應 vision 第 7 節「承諾裝置」—— 用視覺事實讓自我聲明具有問責重量。
2. **點擊不可跳過**（停滿才自動進入），元件不接 `onClick`。
3. 回饋：輕量短促音效（≤ 0.3 秒、< 30KB，置於 `public/sounds/stamp.mp3`，以 `try/catch` 包裹、autoplay 失敗 silent）+ haptic 短震（`useHaptic`，不支援時 noop）。裝置靜音時不播音效、haptic 仍觸發。

### 登記者身份 badge（`RecorderBadge`）

1. 「登記者：[座號]」大型 badge MUST **常駐**於學生名單外框正上方（承諾裝置在每次登記時持續可見），**不可**作為附屬資訊或僅在登記後才出現。
2. 依三種指派狀態分流視覺，三態皆顯示 badge、差別在強度 / 星星 / 小行字：
   - **受指定**：強調色（`bg-accent-200`）+ `lucide:star` + 進場 fade-in（**僅播 1 次**，非持續閃爍）+ 小行字「你是老師指定的登記者！」
   - **未指定（他人受指定）**：灰藍系（`bg-slate-100`，**非警告色**，不用紅黃）+ 小行字「你不是被指定的小老師>\_<」
   - **沒指定任何人**：中性純黑邊白底 + **無**小行字
3. 點 badge 觸發換座號流程（彈窗 → 重新進入 `/join`）；換座號是顯式行為（重新入場），不就地切換。
4. 登記頁 header **不**再放座號 badge；學生名單頂部**不**放「N 已繳 / N 未繳」統計（催繳是老師 / 家長責任，違反角色分工）。

### 動畫規範（NFR-008）

- 進場 / 印章動畫 MUST 以 `transform` / `opacity` 實作以維持 60fps；keyframes 定義於 `globals.css`（`pop-in` / `stamp-in` / `fade-in`）。
- 動畫**克制**（vision「不把學生當小孩對待」）：星星 fade-in 僅 1 次、音效短促、不要每個操作都閃光發聲。
- MUST 尊重 `prefers-reduced-motion`（已於 `globals.css` 將動畫時長縮到接近 0）。

### 兒童語氣文案規範

- 所有 user-facing 文字 MUST 走 i18n（NFR-001），不硬寫進元件；學生面向文字用兒童語氣。
- 錯誤 / 限制發生時，提示要**指向概念與下一步出路**，不只是「再試一次」。子原則「**不讓學生在不知道下一步的狀況下卡住**」具體應用：
  - 相機 / 瀏覽器不支援 → 自動把焦點切到下方輸入框
  - 連續失敗 3 次以上 → 升級為「去找老師」（不再讓他繼續試）
  - 拒絕相機權限 → 同時鋪「找老師」與「也可以直接打字」兩條路

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
| 進場過場 / 自我聲明印章（003） | `src/components/JoinTransition.tsx`、`src/components/IdentityStamp.tsx` |
| 登記者身份 badge（003） | `src/components/RecorderBadge.tsx` |
| 失敗計數 / haptic hook（003） | `src/hooks/useFailureCounter.ts`、`src/hooks/useHaptic.ts` |
