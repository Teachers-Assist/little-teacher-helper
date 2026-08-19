# 「回報問題」接法 — 逐檔補丁

新增 2 個檔案、改 5 處。新檔案的語法都用 esbuild 檢查過。

**範圍**：只做「有網路、點了就開表單」這條路。離線暫存、剪貼簿備援、連線後提示條**都不做**。

| 動作 | 檔案 |
|---|---|
| 新增 | `src/lib/feedback.ts` |
| 新增 | `src/components/FeedbackMenuItem.tsx` |
| 改 | `src/lib/icons-setup.ts`（1 行） |
| 改 | `src/messages/zh-TW.ts` + `en.ts`（1 個 key） |
| 改 | `next.config.ts` |
| 改 | `src/components/SettingsMenu.tsx` |
| 改（選配） | `src/app/teacher/rooms/[id]/page.tsx` |

---

## `src/lib/icons-setup.ts`

`FeedbackMenuItem` 用了 `lucide:message-square-warning`，這個名字**必須先註冊**才會顯示
（`icons-setup.ts` 只會把 `USED_ICONS` 列到的 icon 打包進去）。

```typescript
const USED_ICONS = [
  // ...既有的...
  'message-square-warning',   // ← 新增（回報問題）
] as const;
```

> 我已經確認 `message-square-warning` 存在於 `@iconify-json/lucide`。
> 順便建議把下面「附錄」提到的既有問題一起修掉。

---

## `src/messages/zh-TW.ts` 與 `en.ts`

`en.ts` 的結構必須與 `zh-TW.ts` **完全一致**，否則 build 會失敗
（`messages/index.ts` 的 `Record<Locale, Messages>` 賦值兼作一致性守門）。所以兩份都要加。

放的位置：加在 `sync: { ... }` 區塊後面即可（頂層 key，與 `network` / `sync` / `toast` 同層）。

**`zh-TW.ts`**

```typescript
  feedback: {
    menuLabel: '回報問題',
  },
```

**`en.ts`**

```typescript
  feedback: {
    menuLabel: 'Report a problem',
  },
```

---

## `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  env: {
    // 用來對應「這個 bug 是哪一版的」。在 Cloudflare 專案環境變數設定，
    // 作法與既有的 NEXT_PUBLIC_APP_URL 一致；沒設就是 'dev'。
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
  },
};
```

---

## `src/components/SettingsMenu.tsx`

三處改動。

**1. 加 import**

```typescript
import { FeedbackMenuItem } from '@/components/FeedbackMenuItem';
```

**2. 在 panel 裡加一項。** 找到現有的還原連結區塊，改成：

```tsx
      {variant === 'sidebar' && (
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
          <FeedbackMenuItem onDone={() => setOpen(false)} />

          {teacherId && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowRestoreWarn(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Icon name="lucide:link" size={14} className="shrink-0 text-slate-400" />
              {messages.teacher.restore.copyLink}
            </button>
          )}
        </div>
      )}
```

> 注意條件變了：外層由 `variant === 'sidebar' && teacherId` 改成只看 `variant`，
> 讓還沒建立老師身分的人也能回報問題（「我按了建立班級但沒反應」正是最該收到的回報）。
> 還原連結那一項仍然保留 `teacherId` 條件。

**3. panel 的寬度要放寬**：`w-44` → `w-52`（「回報問題」比「設定」長，44 會被擠掉）。

---

## `src/app/teacher/rooms/[id]/page.tsx`（選配，1 行）

讓回報自動帶上班級代碼。在既有取得 room 之後加：

```typescript
import { rememberRoomCode } from '@/lib/feedback';

// ...在 room 載入後
useEffect(() => {
  if (room?.code) rememberRoomCode(room.code);
}, [room?.code]);
```

不加也能運作，只是 `[B13] 班級代碼` 會空著。

---

## 上線前一定要驗的兩件事

1. **`[B12]` 日期時間的預填格式沒有實測過。** `feedback.ts` 的 `appendOccurredAt` 用的是
   `entry.N_year` / `_month` / `_day` / `_hour` / `_minute` 五個參數，但這是推測。
   請在表單 UI 用「取得預先填入的連結」填一個日期時間，看網址實際產生什麼參數再對照。
   失敗是良性的（只有那欄留空）；懶得對就把 `[B12]` 在表單裡改成簡答題。

2. **選項字串要一字不差。** `feedback.ts` 的 `SCREEN` / `DEVICE` / `SYNC_STATE`
   必須與 `google-form-builder.gs` 的 `OPT` 完全相同。差一個字，該欄**靜默留空、不報錯**。
   （`OPT.network` 在 App 端沒有對應常數，因為 `[B4]` 不預填。）

---

## 預填了哪些欄位

| 欄位 | 來源 |
|---|---|
| `[B1]` 出問題的畫面 | `usePathname()` 對照路由表 |
| `[B2]` 出問題的裝置 | 角色區域（`/teacher` vs `/helper`）+ UA |
| `[B5]` 畫面上當時的同步狀態 | `useSyncStatus()` 的佇列狀態 |
| `[B12]` 大約發生時間 | `new Date()` |
| `[B13]` 班級代碼 | sessionStorage（進班級頁時寫入） |
| `[X1]` 系統版本 | build 時注入的 `NEXT_PUBLIC_APP_VERSION` |

**`[B4] 當時的網路狀況` 刻意不預填。** 能預填的只有「按下回報的當下」，
而不是「出問題的當下」——老師事後回報時一律會變成「正常」。
錯的預填比空著更糟：看起來合理，老師就不會去改它。表單裡 `[B4]` 是選填，
交給老師自己回想比較誠實。

`[B5]` 沒有這個問題，它讀的是本機佇列的實際狀態，跟連線與否無關，事後回報仍然有效。

---

# 附錄：順手發現的既有問題（與本次功能無關）

我為了確認 icon 名稱，把 `USED_ICONS` 跟實際的 `@iconify-json/lucide` 套件對了一次，
發現**有些 icon 現在是渲染空白的**。

`icons-setup.ts` 的組裝迴圈是：

```typescript
for (const name of USED_ICONS) {
  if (rawIcons[name]) subset[name] = rawIcons[name];   // ← 名字不存在就靜默跳過
}
```

名字打錯或套件改名時**不會報錯，只會少一個 icon**，所以很難發現。

## A. `USED_ICONS` 裡有 6 個名字在套件中已不存在

lucide 在 v1.0 把一批 icon 改名（形容詞後置），這些舊名沒有被更新：

| 目前寫的 | 現在的名字 |
|---|---|
| `alert-circle` | `circle-alert` |
| `alert-triangle` | `triangle-alert` |
| `play-circle` | `circle-play` |
| `bar-chart-2` | 已移除，改用 `chart-no-axes-column` 之類 |
| `check-circle-2` | 已移除，改用 `circle-check-big` |
| `loader-2` | 已移除，改用 `loader-circle` |

## B. 有 4 個 icon 被用到但沒註冊

| icon | 用在哪 |
|---|---|
| `lucide:link` | `SettingsMenu.tsx`（複製還原連結） |
| `lucide:menu` | `app/teacher/layout.tsx`（小螢幕 hamburger，FR-061） |
| `lucide:activity` | `app/teacher/rooms/[id]/page.tsx` |
| `lucide:cloud-off` | `app/teacher/rooms/[id]/page.tsx` |

`lucide:menu` 這個特別值得修：**小螢幕的 hamburger 按鈕現在是空白的**，
而 FR-061 就是為了「移除返回連結後仍能導航」才加的。按鈕還能點（有 aria-label），
但視覺上看不到，等於小螢幕的老師沒有導航入口。

> ⚠️ 我是對 `@iconify-json/lucide@1.2.123` 驗的，你的 `package.json` 寫 `^1.2.109`，
> 實際版本以 lockfile 為準。建議自己跑一次確認：
>
> ```bash
> node -e "const d=require('@iconify-json/lucide/icons.json'),fs=require('fs');
> const reg=[...fs.readFileSync('src/lib/icons-setup.ts','utf8').matchAll(/^\s*'([a-z0-9-]+)',/gm)].map(m=>m[1]);
> console.log('不存在的:', reg.filter(n=>!d.icons[n]));"
> ```
>
> 更根本的修法是把 `icons-setup.ts` 的迴圈改成「找不到就 throw」，
> 讓打錯名字在 build 時就爆掉，而不是靜默少一個圖示。
