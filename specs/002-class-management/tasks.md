# Tasks: 002 班級管理體驗強化

**Input**: `specs/002-class-management/spec.md`
**Prerequisites**: 001 已實作完成，本 feature 在其上擴充

**Tests**: 暫不包含測試任務（與 001 一致）

**Organization**: Tasks 按 User Story 分組，可獨立實作與驗收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、無相依）
- **[Story]**: US1=Excel 匯入, US2=學生管理, US3=任務管理, US4=班級狀況 tab, US5=元件拆分, US6=任務細節頁
- 描述 MUST 包含確切檔案路徑

---

## Phase 1: Foundational（共用基礎建設）

- [x] T101 [P] 在 `prisma/schema.prisma` 為 Task model 新增 `isArchived Boolean @default(false)` 欄位
- [x] T102 在 root 執行 Prisma migration：`pnpm prisma migrate dev --name add-task-archived`
- [x] T103 [P] 在 `src/types/index.ts` 補上 `Task.isArchived` 型別
- [x] T104 [P] 安裝 Excel 解析套件：`pnpm add xlsx`（評估 SheetJS 與 exceljs，擇一）
- [x] T105 [P] 在 `src/lib/excelTemplate.ts` 建立範本檔產生器（座號、姓名兩欄 + 一列範例）
- [x] T106 [P] 將靜態範本 `public/templates/students-template.xlsx` 預先產生並 commit

**Checkpoint**: 資料模型與工具就緒，可開始 user story 實作

---

## Phase 2: User Story 1 — Excel 匯入學生 (Priority: P1)

**Goal**: 老師可下載範本、上傳 Excel 批次匯入學生，衝突時整批拒絕並列出原因

**Independent Test**: 在 `/teacher/rooms/[id]` 學生 tab 完成範本下載 → 填入 10 筆 → 上傳成功；製造衝突 → 看到列號清單

### API

- [x] T107 [US1] 在 `src/lib/excelParser.ts` 實作 Excel 解析：欄位驗證、檔案內衝突偵測、回傳結構化錯誤
- [x] T108 [US1] 在 `src/app/api/rooms/[id]/students/import/route.ts` 新增 POST endpoint：接收檔案、呼叫 parser、檢查與既有資料衝突、整批寫入
- [x] T109 [US1] 在 `src/app/api/rooms/[id]/students/template/route.ts` 新增 GET endpoint：回傳範本檔（或直接服務靜態檔）

### UI

- [x] T110 [P] [US1] 在 `src/components/StudentImport.tsx` 新增匯入元件：下載範本按鈕、上傳區、衝突列表顯示
- [x] T111 [US1] 將 `StudentImport` 整合進 `src/app/teacher/rooms/new/page.tsx` 學生名單區塊
- [x] T112 [US1] 將 `StudentImport` 整合進 `src/app/teacher/rooms/[id]/page.tsx` 學生 tab 側欄（與「新增單筆」並列）

### i18n

- [x] T113 [P] [US1] 在 `src/i18n/messages.ts`（或對應檔）新增匯入相關訊息：成功、衝突類型描述、檔案錯誤

**Checkpoint**: 老師可批次匯入學生

---

## Phase 3: User Story 2 — 學生編輯與軟刪除 (Priority: P1)

**Goal**: 老師可在學生 tab 編輯、軟刪除學生，並透過「已移除」入口還原。**編輯介面與任務編輯（US3）一致 —— 側欄 inline 表單 + 模式切換，不用 modal**。

**Independent Test**: 點學生編輯 icon → 側欄表單變編輯模式 → 改完儲存 → 表單回新增模式；移除學生 → 「已移除」入口看得到 → 還原 → 主清單顯示

### API

- [x] T114 [US2] 在 `src/app/api/rooms/[id]/students/route.ts` 補上 GET query: `includeRemoved=true` 支援
- [x] T115 [US2] 在 `src/app/api/rooms/[id]/students/[studentId]/route.ts` 新增 PATCH（編輯）、DELETE（soft delete，設 `isRemoved=true`）、POST `/restore`（還原）

### UI 元件

- [x] T116 [P] [US2] 新增 `src/components/StudentForm.tsx`：**內嵌表單**（非 modal），取代目前 `rooms/[id]/page.tsx` 內嵌的新增學生表單；支援「新增」與「編輯」兩種模式，欄位含座號、姓名；編輯模式顯示「正在編輯：[姓名]」與「取消編輯」按鈕。**與 `TaskForm` 共用相同的視覺結構與行為樣式**
- [x] T117 [P] [US2] 修改 `src/components/StudentRoster.tsx`（US5 拆分後的元件）：每列加上編輯 / 移除 icon
- [x] T118 [P] [US2] 新增 `src/components/RemovedStudentsDrawer.tsx`：已移除學生清單 + 還原按鈕

### UI 整合

- [x] T119 [US2] 修改 `src/app/teacher/rooms/[id]/page.tsx` 學生 tab：
  - 用 `StudentForm` 取代原內嵌的新增學生表單
  - 加上「已移除學生」入口開啟 `RemovedStudentsDrawer`
  - 接好列項編輯 icon → 載入學生到 `StudentForm`、移除 icon → 一層確認對話框

**Checkpoint**: 老師可完整管理學生名單，互動模式與任務 tab 完全一致

---

## Phase 4: User Story 3 — 任務管理 inline 化、layout 重構與軟封存 (Priority: P1)

**Goal**: 老師可在任務 tab 內以與學生 tab 一致的方式新增、編輯、封存任務。先做 layout 重構（班級資訊上提）為 inline 表單騰出空間。

**Independent Test**: 切換學生 / 任務 tab 時，班級資訊不重複出現於側欄；任務 tab 側欄頂部直接是新增表單；點任務列項編輯 icon → 表單變編輯模式 → 儲存 → 表單回新增模式；點封存 icon 確認 → 任務從列表消失 → 已封存入口可還原。

### Layout 重構（前置）

- [x] T120 [US3] 修改 `src/app/teacher/rooms/[id]/page.tsx`：將「班級資訊」卡片從每個 tab 的側欄拉出，改放於 tab 列**之上**，所有 tab 共用一份
- [x] T121 [US3] 同步移除各 tab 側欄內重複的班級資訊區塊（學生 tab 的「房間資訊」、任務 tab 的「房間資訊」、班級狀況 tab 的「房間資訊」）

### API

- [x] T122 [US3] 在 `src/app/api/tasks/[roomId]/route.ts` 補上 GET query: `includeArchived=true`，預設過濾 `isArchived=false`
- [x] T123 [US3] 在 `src/app/api/tasks/[roomId]/[taskId]/route.ts` 補上 PATCH `isArchived=true`（封存）與 POST `/restore`（還原）

### UI 元件

- [x] T124 [P] [US3] 新增 `src/components/TaskForm.tsx`：**內嵌表單**（非 drawer），支援「新增」與「編輯」兩種模式，欄位含名稱、類型、指定座號、截止時間；編輯模式顯示「正在編輯：[任務名]」與「取消編輯」按鈕。
  - **截止日欄位 MUST 阻擋過往日期**：HTML `<input type="date" min={今日 ISO 字串}>` + 提交前 JS 驗證
  - **編輯既有任務時**若原 `dueDate` 已過往：欄位 MUST 自動清空，並顯示輔助文字「原截止日 [日期] 已過，請重設或留空」（避免老師多做一個手動清除的步驟）
  - **支援「聚焦到截止日欄位」的 prop**（給 FR-042 的「延長截止」入口用）
- [x] T125 [P] [US3] 新增 `src/components/ArchivedTasksDrawer.tsx`：已封存任務清單側拉抽屜 + 還原按鈕

### UI 整合

- [x] T126 [US3] 修改 `src/app/teacher/rooms/[id]/page.tsx` 任務 tab：
  - 側欄頂部放入 `TaskForm`（與學生 tab 的新增表單位置一致），**移除「右上按鈕」與舊的「管理任務」連結**
  - 每一任務列項加「編輯」icon（點擊將該任務載入 `TaskForm`）與「封存」icon（彈出一層確認對話框）
  - 每一任務列項徽章與按鈕依 `(status, dueDate)` 派生（FR-041 / FR-042）：
    - `ACTIVE` 未截止 → 徽章「進行中」 + 「結案」按鈕（一層確認）
    - `ACTIVE` 已截止（dueDate 過往）→ 徽章「已截止」 + 「延長截止」（主要）+ 「結案」（次要，一層確認）
    - `HELPER_COMPLETED` → 徽章「小老師已標記完成」 + 「重新開放」（無確認）+ 「結案」（一層確認）
    - `CLOSED` → 徽章「已結案」 + 「重新開放」按鈕
  - 「延長截止」與「重新開放 CLOSED 且 dueDate 過往」共用 UX（FR-043）：開啟側欄 `TaskForm` 編輯模式 + autoFocus dueDate；儲存後依按鈕來源決定是否動 status
  - 「重新開放 CLOSED 且 dueDate 為未來 / null」（FR-044）→ 直接 PATCH status=ACTIVE
  - 加上「已封存任務」入口開啟 `ArchivedTasksDrawer`
- [x] T126a [US3] 在 `src/lib/task.ts` 新增 `getTaskDisplayState(task): { badge, actions }` 純函式：依 `(status, dueDate, now)` 派生徽章與按鈕清單；老師端列項與 `TaskForm` 共用此邏輯
- [x] T126b [P] [US3] 整合對話框文案到 i18n（`messages.teacher.taskStatusExtendDue` / `taskStatusReopen` / `taskStatusClose` / `taskBadgeDueExpired` 等）

**Note**：學生端的 lockReason 邏輯維持原樣（status=ACTIVE 但 dueDate < now → DUE_PASSED；status=HELPER_COMPLETED/CLOSED → COMPLETED）。本 feature 不改動 status enum 與 data model。

**Checkpoint**: 任務管理與學生管理互動模式一致，編輯入口統一；status 流轉與截止日管理皆在任務 tab 內完成

---

## Phase 5: User Story 4 — 班級狀況 tab（取代原「報表 tab」） (Priority: P1)

**Goal**: 報表 tab 重新定位為「班級狀況 tab」，顯示警告 + 簡易統計；不展開個別任務的完整登記細節（那是 US6 細節頁的職責）。

**Independent Test**: 進入班級狀況 tab → 看到統計卡 + 警告區（無異常時顯示空白狀態）→ 製造異常 → 警告區顯示對應任務 → 點警告 → 跳到該任務細節頁。

### API

- [x] T127 [US4] 在 `src/app/api/rooms/[id]/monitoring/route.ts` 新增 GET endpoint：回傳簡易統計（總數、進行中、有異常、已封存）+ 警告清單（每筆含 taskId、異常類型、發生時間 / 閾值資訊）
- [x] T128 [US4] 在 `src/lib/anomalyDetection.ts` 實作異常判斷邏輯，閾值預設值寫入並由 plan.md 紀錄：指定座號 24h 無登記、所有人未登記且距截止 < 6h、裝置長時間未同步（具體閾值由 plan.md 定義）

### UI

- [x] T129 [P] [US4] 新增 `src/components/MonitoringStats.tsx`：簡易統計卡片區塊
- [x] T130 [P] [US4] 新增 `src/components/MonitoringAlerts.tsx`：警告清單區塊（空白狀態 + 警告卡片），點警告 `router.push('/teacher/tasks/{roomId}/{taskId}')`
- [x] T131 [US4] 修改 `src/app/teacher/rooms/[id]/page.tsx` 班級狀況 tab：
  - tab 名稱從「報表」改為「班級狀況」（最終文案於 i18n 階段決定）
  - 預設渲染 `MonitoringStats` + `MonitoringAlerts`
  - 移除原本側欄的「選擇任務」下拉與內嵌 `ReportView`

**Checkpoint**: 老師打開班級狀況 tab 立刻知道有沒有要處理的事，需要細節則跳到細節頁

---

## Phase 6: User Story 5 — StudentList 元件拆分 (Priority: P2)

**Goal**: 老師端與小老師端的學生列表元件職責分離

**Independent Test**: 老師端搜不到 Checkbox；小老師端登記體驗不變

- [x] T132 [US5] 從 `src/components/StudentList.tsx` 複製出 `src/components/StudentRoster.tsx`：唯讀、無 checkbox、預留 icon 插槽（在 US2 填入）
- [~] T133 [US5] **刻意略過（2026-06-26）**：經查小老師端登記頁使用 `RecordForm`，並非 `StudentList`；`StudentList` 實際上**只有老師端**在用。拆成兩元件的「共用」前提不成立，建立 `StudentChecklist` 會是 dead code。改為：建 `StudentRoster`（老師端）+ 刪 `StudentList`，SC-013 達成。待 spec-align 修正 FR-038 文字。
- [x] T134 [US5] 修改 `src/app/teacher/rooms/[id]/page.tsx`：使用 `StudentRoster` 取代 `StudentList`
- [~] T135 [US5] **不需變更（2026-06-26）**：helper 登記頁本來就用 `RecordForm`，未曾 import `StudentList`。
- [x] T136 [US5] 刪除 `src/components/StudentList.tsx`（確認無其他引用後）

**Checkpoint**: 元件職責清晰，老師端不再有不必要的 checkbox

---

## Phase 7: User Story 6 — 任務細節頁與舊路由廢除 (Priority: P1)

**Goal**: `/teacher/tasks/[roomId]/[taskId]` 改造為單一任務的「結果頁」；廢除舊的列表頁 `/teacher/tasks/[roomId]`

**Independent Test**: 從任務 tab 點任務名稱、從班級狀況 tab 點警告 → 都進到同一個細節頁；該頁顯示完整登記資料與匯出；舊 `/teacher/tasks/[roomId]` 直接被刪除（網站未上線、無 legacy URL）

### 廢除舊列表頁

- [x] T137 [US6] 刪除 `src/app/teacher/tasks/[roomId]/page.tsx`（不做 redirect handler）
- [x] T138 [US6] 確認專案內無其他元件 import 或 link 至 `/teacher/tasks/[roomId]`（grep `tasks/${roomId}` / `tasks/[roomId]`，把連結改成 `rooms/[roomId]?tab=tasks`）

### 細節頁

- [x] T139 [US6] 新增 / 改造 `src/app/teacher/tasks/[roomId]/[taskId]/page.tsx`：
  - 顯示任務基本資訊（名稱、類型、指定座號、截止、狀態、`isArchived`）
  - 顯示完整登記列表（學生姓名 / 座號、登記結果、登記者座號、登記時間）
  - 顯示「未登記學生」區塊（學生數 − 已登記數）
  - 提供「匯出為列印格式」與「複製為文字」按鈕（沿用既有 ReportView 的匯出邏輯）
  - 提供「回任務 tab 編輯」連結，導向 `/teacher/rooms/{roomId}?tab=tasks`
- [x] T140 [P] [US6] 從 `src/components/ReportView.tsx` 抽出「單任務結果視圖」可重用元件 `src/components/TaskResultView.tsx`，供細節頁使用
- [x] T141 [US6] 修改 `src/app/teacher/rooms/[id]/page.tsx` 任務 tab 列項：點任務名稱（非 icon）使用 `<Link href="/teacher/tasks/{roomId}/{taskId}">`

**Checkpoint**: 任務 tab 與班級狀況 tab 點進去都到同一個細節頁，舊路由不再可訪問

---

## Phase 8: User Story 7 — QRCode 改為 modal (Priority: P1)

**Goal**: 班級資訊區塊新增「顯示 QRCode」按鈕開 modal；舊頁面 `/teacher/rooms/[id]/qrcode/page.tsx` 直接刪除

**Independent Test**: 點班級資訊區塊「顯示 QRCode」→ 全螢幕黑底 modal 開啟 + URL 變 `?qr=open` → 「複製代碼」顯示 toast → 按「進入全螢幕」進真實 Fullscreen → ESC 退出 → 直接訪問 `?qr=open` 自動開啟 modal

### 共用元件

- [x] T146 [US7] 若 `src/components/ui/Toast.tsx`（或對應 hook）尚未存在，建立基礎 toast 元件 + Provider；提供 `useToast()` 介面
- [~] T147 [US7] **未另建通用 Modal（2026-06-26）**：QRCode modal 的視覺與全螢幕行為特殊（滿版黑底、Fullscreen API、ESC 兩段式），已直接在 `QRCodeModal.tsx` 內自含 overlay + ESC + 點外側關閉 + aria。既有 `ConfirmDialog` 已涵蓋一般確認彈窗需求，無須再抽通用 Modal。

### QRCode Modal

- [x] T148 [US7] 新增 `src/components/QRCodeModal.tsx`：
  - 滿版黑色半透明背景 + 中央白卡
  - 內容順序：班級名（大字）→ QRCode 圖（邊長 400–520px，保留 quiet zone）→ 6 字短碼（字級大、與 QRCode 視覺重量相當）
  - 操作區：「進入全螢幕」（呼叫 `document.documentElement.requestFullscreen()`）、「複製代碼」、「複製連結」
  - 複製成功 / 失敗用 `useToast()`，**不使用 `alert()`**
  - 內部沿用 / 重構 `QRCodeDisplay.tsx`（拆出純圖片呈現邏輯，去掉雙層白卡的根源）
- [x] T149 [US7] 修改 `src/app/teacher/rooms/[id]/page.tsx`：
  - 在班級資訊區塊（US3 已上提至 tab 列之上）加上「顯示 QRCode」按鈕
  - 接 URL query `?qr=open` ↔ modal 開啟狀態同步（`useSearchParams` + `useRouter.replace`）
  - 訪問帶 `?qr=open` 時自動開啟 modal
- [x] T150 [US7] 刪除 `src/app/teacher/rooms/[id]/qrcode/page.tsx`（網站未上線、不需 redirect）
- [x] T151 [US7] 整理 i18n：
  - 移除 `messages.qr.printQrcode`（列印不再使用）
  - 新增 / 修改：`qr.modalTitle`、`qr.fullscreen`、`qr.copyCodeSuccess`、`qr.copyUrlSuccess`、`qr.copyFailed` 等

**Checkpoint**: 老師可直接在 `/teacher/rooms/[id]` 開出 QRCode modal，並能投影、複製、進入全螢幕

---

## Phase 9: User Story 8 — Dashboard 雙視角改造 + 側欄重構 (Priority: P1)

**Goal**: Dashboard 改為「簡易統計 + 雙 tab（按班級 / 按任務檢視）」；側欄拿掉偽按鈕、加入「我的班級」可展開清單（含待辦數 + 異常數）；所有 page-header 返回連結移除，小螢幕用 hamburger 開側欄

**Independent Test**: 進入 dashboard → 看到統計 + 預設「按班級檢視」每班一張卡片（待辦數、異常紅點、最近活動）→ 切「按任務檢視」看到所有進行中任務 + 搜尋框 + 異常者插旗 → 在搜尋框輸入「數學」即時過濾 → 側欄「我的班級」可展開、有異常的班級旁有紅點 → 桌機尺寸 page-header 不再有返回連結 → < 768px 自動出現 hamburger

### API

- [x] T156 [US8] 新增 `src/app/api/teachers/[id]/dashboard/route.ts` GET endpoint，回傳結構：
  ```
  {
    stats: { roomCount, inProgressTaskCount, anomalyCount },
    rooms: [{ id, name, inProgressTaskCount, anomalyCount, lastActivityAt }],
    tasks: [{ id, roomId, roomName, name, type, status, recordedCount, studentCount, isAnomaly, anomalyReason, lastActivityAt }]
  }
  ```
  - 異常判斷共用 `src/lib/anomalyDetection.ts`（US4 已建立）
  - 任務範圍：所有 `status=ACTIVE && isArchived=false` 的任務（已封存 / 已結案不顯示）
  - 排序：tasks 按 lastActivityAt desc；rooms 按 lastActivityAt desc

### Dashboard 頁面改造

- [x] T157 [US8] 改造 `src/app/teacher/page.tsx`：
  - 刪除既有班級卡片網格區塊
  - 結構：page-header（右上「新增班級」）+ `<DashboardStats>` + `<Tabs>`（「按班級檢視」/「按任務檢視」）
  - **預設 tab 邏輯**：1 班 → 預設「按任務檢視」；≥ 2 班 → 預設「按班級檢視」；使用者主動切換後可用 sessionStorage 暫存（不持久化）
  - 0 班時不顯示 tab，改顯示「來建立第一個班級吧」+「新增班級」按鈕
- [x] T158 [P] [US8] 新增 `src/components/dashboard/DashboardStats.tsx`：橫向三格卡片，顯示班級數、進行中任務數、異常數
- [x] T159 [P] [US8] 新增 `src/components/dashboard/ClassesView.tsx`（按班級檢視 tab 內容）：
  - 每班一張卡片，顯示：班級名（大字）+ 進行中任務數 + 異常數紅點（無則隱藏）+ 最近活動時間（相對時間：「3 小時前」、「今早」、「昨天」等）
  - 點卡片跳 `/teacher/rooms/{id}`
  - Grid 排版（sm:grid-cols-2、lg:grid-cols-3）
- [x] T160 [P] [US8] 新增 `src/components/dashboard/TasksView.tsx`（按任務檢視 tab 內容）：
  - 頂部搜尋框（佔位文字「🔍 搜尋任務名稱」）
  - 跨班級任務清單，每筆顯示：「[班級名] · [任務名] · 已登記比例（X/Y）· 狀態徽章」
  - 異常任務插紅色 alert icon（hover / 點擊顯示異常原因）
  - 搜尋為即時 filter（`useDeferredValue` 或簡單 `useState`）；空搜尋恢復全部
  - 空狀態（無進行中任務）：「還沒有進行中的任務喔」+ 隱藏搜尋框
  - 點任一任務跳 `/teacher/tasks/{roomId}/{taskId}`

### 側欄重構

- [x] T161 [US8] 修改 `src/components/layout/TeacherSidebar.tsx`：
  - **刪除** line 65 的「班級」偽按鈕
  - 新增「我的班級」可展開項目（accordion 或 disclosure）
  - 展開後列出該老師所有班級，每筆顯示班級名 + 待辦數 + 異常數紅點（資料源沿用 T156 endpoint 的 rooms 欄位）
  - 點班級項目跳 `/teacher/rooms/{id}`
  - 0 個班級時展開顯示「還沒建立班級喔」+「新增班級」按鈕
- [x] T162 [P] [US8] 新增 `src/components/layout/TeacherSidebarClassList.tsx`（封裝展開清單邏輯，獨立可測）

### 響應式與返回連結

- [x] T163 [US8] 全站掃描 `/teacher/*` 頁面，**移除所有 page-header 內的「返回儀表板」/「返回房間」/「返回某某」連結**（包含 `rooms/[id]/page.tsx`、`tasks/[roomId]/[taskId]/page.tsx`、`rooms/new/page.tsx` 等所有 page-header）
- [x] T164 [US8] 修改 `src/app/teacher/layout.tsx`：
  - 桌機尺寸（≥ 768px）：側欄常駐
  - 小螢幕（< 768px）：側欄收合為抽屜模式
  - page-header 左側加 hamburger 按鈕（僅小螢幕顯示），點擊開側欄抽屜
- [x] T165 [P] [US8] 新增 i18n keys：
  - `nav.myClasses`、`nav.expandClasses`、`nav.noClassYet`
  - `teacher.dashboardClassesView`、`teacher.dashboardTasksView`
  - `teacher.statRoomCount`、`teacher.statInProgressTasks`、`teacher.statAnomalies`
  - `teacher.taskSearchPlaceholder`、`teacher.noInProgressTasks`、`teacher.createFirstClass`
  - `teacher.lastActivityRelative`（接受 i18n date-fns 或自訂相對時間格式）

**Checkpoint**: Dashboard 雙視角讓導師（看自己班）與科任（跨班看任務）都能找到適合的視角；側欄成為唯一導航中樞

---

## Phase 10: 文件對齊

- [x] T166 在 `specs/ui-spec.md` 新增「互動模式判斷規則」段落（班級資訊上提、inline 表單模式切換、可逆動作一層確認、QRCode 採 modal 是「展示 / 分享」例外不是「編輯資料」、側欄為唯一導航中樞、小螢幕 hamburger 模式、dashboard 雙視角設計原則），對應 NFR-006 / NFR-007
- [x] T167 在 `specs/data-model.md`（已於 spec-align 移到外層）Task 區塊補上 `isArchived` 欄位（含表格、Prisma schema、Soft Archive 段落、生命週期圖、Offline 註解）—— **已由 spec-align 2026-06-25 完成**
- [x] T168 在 `specs/001-little-teacher-helper/plan.md` 註記 002 feature 已擴充 Task entity 與路由結構（QRCode 頁面廢除、tasks/[roomId] 列表頁廢除、dashboard 改造）
- [x] T169 執行 `spec-align` skill 檢查所有文件一致（含 i18n 對齊；spec-align skill 會由使用者擴充以涵蓋 `src/i18n/messages.ts`）

**Checkpoint**: 002 feature 完整收尾

---

## 依賴關係

```
T101–T106 (Foundational)
    │
    ├─→ T107–T113 (US1 Excel 匯入)
    │
    ├─→ T132–T136 (US5 元件拆分)        ──┐
    │                                       ├─→ T114–T119 (US2 學生管理)
    │                                       └─→ 共用 StudentForm 與 TaskForm 互動樣式
    │
    ├─→ T120–T126 (US3 任務管理 + layout 重構)
    │       │
    │       └─→ T146–T151 (US7 QRCode modal，依賴 US3 的班級資訊區塊上提)
    │
    ├─→ T127–T131 (US4 班級狀況 tab)
    │       │
    │       └─→ T137–T141 (US6 細節頁，US4 的警告會跳到這頁)
    │
    ├─→ T156–T165 (US8 Dashboard 雙視角 + 側欄重構，異常判斷沿用 US4 的 anomalyDetection 工具)
    │
    └─→ T166–T169 (Phase 10 文件對齊)
```

**關鍵相依**:
- US5（元件拆分）應在 US2 進入 UI 階段（T117）前完成，否則 `StudentRoster` 不存在
- US3 與 US2 的 inline 表單樣式應同時設計（共用視覺與行為），建議 T116（StudentForm）與 T124（TaskForm）由同一人完成
- US6 細節頁是 US4 警告的終點，可平行開發但需在最終整合測試時對齊路由
- US7 QRCode modal 依賴 US3 已把「班級資訊」上提到 tab 列之上（按鈕入口位置）；T146–T147 的 Toast / Modal 基礎元件先抽出可供未來其他 US 共用
- US8 沿用 US4 的 `anomalyDetection.ts` 工具函式（共用判斷邏輯），但 dashboard 元件 `ClassesView` / `TasksView` 與 US4 的 `MonitoringStats` / `MonitoringAlerts` **不互相依賴**（任務檢視不是警告清單、是進行中任務清單）
- T163（page-header 返回連結移除）應在 US8 最後做，避免在開發過程中失去返回路徑

---

## 給 AI agent 的實作指引

1. **接手時請先讀 `spec.md` 而非從這份檔案開始**：spec 告訴你 why，tasks 告訴你 where。
2. **每完成一個 task 將 `[ ]` 改為 `[x]`**，並在 PR 描述引用 task ID。
3. **遇到 spec 未涵蓋的判斷**（例如異常強調的具體閾值）：
   - 不要自行決定，去 `specs/open-questions.md` 加一條，標記 owner 為老師（用戶）
   - 暫以最保守的值實作（如：閾值設無限大，等同不觸發）
4. **若實作中發現 spec 寫錯**：改 spec、跑 `spec-align`、再改 code，不要反過來。
