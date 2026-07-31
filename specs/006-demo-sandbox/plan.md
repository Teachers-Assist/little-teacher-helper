# Plan: 006 推廣用示範沙盒 (Demo Sandbox)

**Input**: `specs/006-demo-sandbox/spec.md`
**前置依賴**: 001–005 已實作；手寫 Service Worker 已上線（`public/sw.js` + `src/components/ServiceWorkerRegistration.tsx`，git `da9b480`）
**狀態**: 待實作。本 plan 收斂技術決策、資料層抽換策略與施工順序；`tasks.md` 待本 plan 定案後再拆。

> **接手順序**：先讀 `spec.md`（why 與驗收行為），再讀本檔（怎麼做、取捨、落點）。最高約束一句話：**示範全程只在本機，不寫 D1、不動正式 localStorage**。

---

## 1. 核心設計決策

### 1.1 純前端沙盒，資料只進 sessionStorage（守需求 2/4/5）

- **決策**：`/demo`、`/demo/helper` 的所有狀態存 **sessionStorage key `little-helper-demo`**（NFR-019）；不呼叫任何寫 D1 的 API（NFR-020）；**絕不寫入** `teacherId` / `teacherName` / `little-helper-offline-data`（FR-142）。
- **理由**：一旦在 D1 建真 Room/Teacher，需求 2（不汙染）、4（各裝置隔離）、5（不無限擴充）幾乎必然被破壞。sessionStorage 天然「各分頁 session 隔離、關閉即回收」，正好對上這三條。
- **回收**：關閉分頁即清；「還原狀態」（`messages.demo.banner.restart`）將 sessionStorage 清回初始種子（FR-151）。不做跨 session 持久化。

### 1.2 資料層抽換策略（核心工作量，三選一）

小老師端是 **hooks-driven**：呈現元件透過 `useOfflineRoom/Students/Tasks/Task/Records/SyncStatus`（`src/lib/offline/store.ts`）取資料，全部源自 `useSyncExternalStore(subscribe, getSnapshot)` 訂閱 `storage.ts` 的單一快照；寫入走 `storage` / `queue.queueRecordUpdate` / `syncController.requestSync`（POST `/api/sync`）。**耦合點集中在兩個模組單例**：`storage.ts`（localStorage key 寫死 `little-helper-offline-data`）、`syncController.ts`（上傳目標寫死 `/api/sync`）。

| 方案 | 做法 | 重用度 | 風險 |
| --- | --- | --- | --- |
| **A（首選）抽換底層目標** | 參數化 `storage` 的 storage 載體（localStorage→sessionStorage `little-helper-demo`）與 `syncController` 的上傳目標（`/api/sync`→BroadcastChannel），由「demo 模式」旗標切換 | 最高——helper page + hooks + 元件幾乎原封重用 | 兩個模組目前是單例、key/endpoint 寫死，需乾淨參數化；若牽動正式路徑要小心不回歸 |
| **B 平行 demo store** | 新寫 `lib/demo/store.ts` 提供**同介面** hooks（sessionStorage + BroadcastChannel），呈現元件改用可注入的 data provider | 中——需把 helper 元件的資料來源參數化（目前直接 import 具名 hooks） | 呈現元件改造面較大 |
| **C demo 專屬畫面** | 只重用無資料依賴的純呈現元件（`RecorderBadge` 等），資料流自寫 | 低——UI 一致性靠自律 | 與正式小老師端易走形 |

- **決策（T601 盤點完成，2026-07-29）：定案方案 B（具體 B2）。**
  - **否決 A**：`storage.ts` 是模組單例（`cache` / `listeners` / `STORAGE_KEY='little-helper-offline-data'` 皆 module scope、key 寫死），且被 001–005 正式路徑重度依賴；`store.ts` 的 hooks 也靜態 import 其具名函式。要「參數化載體」＝把核心模組改成可實例化並讓 hooks 指向 demo 實例，**侵入性大、回歸風險高**，不值得。
  - **B 重用度高（盤點佐證）**：小老師端資料 hooks 集中在 **page 層**，核心子元件（`RecordForm` 等）為 **props-driven、不自 import offline hooks**，可直接重用。
  - **B2 做法**：新寫 `src/lib/demo/store.ts`（sessionStorage `little-helper-demo` + BroadcastChannel 的反應式 store，介面鏡像 `useOffline*`）；`/demo/page.tsx`、`/demo/helper/page.tsx` 為獨立頁面，取代正式 page 的「資料容器」角色，取 demo store 資料後以 **props** 傳給**重用的純子元件**（`RecordForm`、`RecorderBadge`、任務清單卡…）。「同步」直接 broadcast，不經 `queue.ts` / `/api/sync`。**完全不動 `src/lib/offline/*` 與 `/helper/*`，零回歸。**
  - **待 T614 確認的細節**：逐一核對要重用的 helper 子元件是否皆 props-driven（`RecordForm` 已確認）；綁死 offline hooks 者（若有）另寫 demo 版薄殼。
- **不變的紅線**：demo 的 storage 載體 MUST 是 `little-helper-demo`（sessionStorage），MUST NOT 觸碰 `little-helper-offline-data`；「上傳」MUST 是 BroadcastChannel，MUST NOT 打任何 `/api/*`。

### 1.3 跨視窗同步：BroadcastChannel + sessionStorage 複製陷阱

- **決策**：老師視窗與小老師視窗以同源 `BroadcastChannel`（頻道名帶 demo session id，隔離多分頁，Edge Case）傳事件；老師端收到即更新班級狀況。
- **關鍵陷阱**：`window.open` 開的新視窗/分頁雖同源，其 sessionStorage 是**開啟當下複製一份、之後各自獨立**，**不會即時共享**。故兩端狀態同步**必須**靠 BroadcastChannel，**不可**假設 sessionStorage 互通。
- **支援度（已查 caniuse，~95% baseline）**：Edge 79+ / Chrome 54+ / Firefox 38+ / Safari 桌機 15.4+ / iOS Safari 15.4+ / Android Chrome 現代版。MUST 加 `'BroadcastChannel' in window` feature-detect；不支援時同步時機退化但不崩。

### 1.4 手機：新分頁，不做同頁 fallback

- **決策**：手機一律以 `window.open` 開 `/demo/helper`（手機上表現為新分頁），跨分頁靠 BroadcastChannel 同步。**不做同頁 fallback**（US3 AS5）。彈窗被攔截時提示允許彈窗後再試（US3 AS6，`messages.demo.qr.popupBlocked`），不靜默失敗。
- **已知限制**：手機看不到兩端並存、需自行切換分頁對照。

### 1.5 斷網重整靠現有 SW（不新增快取工程）

- **決策**：US4 的「斷網後重整、資料仍在」直接靠現行 `public/sw.js`（導覽 network-first→該網址快取；靜態 cache-first；scope `/` 涵蓋 `/demo*`）。**本 feature 不新增 SW 快取設定。**
- **三個成立前提（驗收 MUST 滿足）**：① production build（SW 僅 prod 註冊）；② 該頁曾在線載過一次（network-first 載過才快取）；③ 資料由 demo 自己的 sessionStorage 於 React 啟動後還原。
- **同步時機**：用真實 `navigator.onLine` / `useNetworkStatus` gate——離線登記標「待同步」且 hold 不 broadcast，`online` 才 flush（重用 `SyncIndicator` 三態）。

---

## 2. 三層引導文字分離（避免資訊牆，US6 AS4）

同頁最多三種引導性文字，MUST 視覺與功能分離、同時只呈現受控份量：

| 層 | 作用 | 載體 | i18n |
| --- | --- | --- | --- |
| 示範模式標示帶 | 安全說明（不會被儲存、不影響真實班級）| 常駐頂帶 | `demo.banner.*` |
| 特色 hint | 一句話點當前畫面特色 | 單則、隨畫面變、可關/輪替 | `demo.hint.*` |
| 建班邀請 | 轉換 CTA | 非攔截、可忽略 | `demo.invite.*` |

---

## 3. 異常提醒：真函式 + 種子時間戳

- 老師端異常 MUST 由真實 `src/lib/anomalyDetection.ts` 的 `detectAnomalies` 對種子算出（FR-145，非寫死），示範採規則一 `TASK_STALLED`。
- 種子任務 C（午餐費、零登記）的 `createdAt` 取「載入當下 − 超過 24h」；時間戳相對 `now` 計算，確保每次載入穩定觸發。
- hint `demo.hint.anomaly` 文案為介紹性（「當任務發生異常（停擺、登記率過低）會顯示…」），描述功能範圍，不限於 demo 只觸發的那一條。

---

## 4. i18n 共用對照（已落地，`spec-align` 產物）

demo 專屬新 key **已寫入** `zh-TW.ts` / `en.ts`（`demo.*` + `landing.tryDemo*`），tsc 通過。共用文字**不新建**，沿用既有 key：

| demo 需要 | 沿用既有 key |
| --- | --- |
| 顯示 QRCode | `teacher.showQrcode` |
| 建立班級（邀請 CTA / 標示帶按鈕）| `teacher.createRoom` |
| 同步四態（同步中/已同步/待同步/離線）| `common.*` / `sync.*` |
| 返回 / 重試 | `common.back` / `common.retry` |
| 小老師端整套 UI（選座號/任務/登記/換座號…）| `qr.*` / `join.*` / `identity.*` / `task.*` |

> 語氣：`/demo/helper` 的操作者是「試用的大人」，故 `demo.helper.*` / `demo.hint.*` 採「親切但說明性」語氣，**非** 003 給兒童的口吻；但重用的既有 helper 文案仍是兒童語氣（因為是同一套畫面）。

---

## 5. 程式碼落點（規劃）

| 檔案 | 角色 |
| --- | --- |
| `src/app/page.tsx` | 首頁新增「試用看看」**次要**入口（`landing.tryDemo*`），層級低於兩正式入口（FR-141）|
| `src/app/demo/page.tsx` | 老師端示範舞台：標示帶、班級狀況、三任務、`detectAnomalies` 異常、顯示 QRCode（假）+ 開窗按鈕、hint、邀請 |
| `src/app/demo/helper/page.tsx` | 小老師端示範：頂部模擬說明（`demo.helper.simNotice`）、選座號、登記；重用小老師端呈現（方案 A/B）|
| `src/lib/demo/seed.ts` | 種子常數（五年二班 6 人 + 3 任務；時間戳相對 `now`）|
| `src/lib/demo/*`（store/channel）| sessionStorage 載體 + BroadcastChannel 封裝（含 feature-detect、session id）；或 A 方案下為 `storage`/`syncController` 的參數化注入 |
| 重用（不改）| `anomalyDetection`、`SyncIndicator`、`RecorderBadge`、`QRCodeModal`（假 code）、`useNetworkStatus`、helper 呈現元件 |
| `src/messages/zh-TW.ts`、`en.ts` | `demo.*` + `landing.tryDemo*`（已落地）|

---

## 6. 施工順序建議

- **T0 前置盤點**：確認 `storage.ts` / `syncController.ts` 能否乾淨參數化 → 定案方案 A 或 B。
- **T1**：`seed.ts` + demo store（sessionStorage `little-helper-demo`）。
- **T2**：`/demo` 老師端舞台（標示帶、三任務、`detectAnomalies` 異常、hint、顯示 QRCode 假 + 開窗按鈕）。
- **T3**：`/demo/helper`（重用小老師端呈現 + 模擬說明 + 選座號 + 登記）。
- **T4**：BroadcastChannel 同步 + `useNetworkStatus` gate（待同步/已同步、離線 hold / online flush）。
- **T5**：斷網重整驗證（prod build）+ 建班邀請 CTA + 首頁入口。
- **T6**：隔離與無汙染驗證（見第 7 節）。

---

## 7. 驗證方式（規劃，對應 Success Criteria）

- **隔離（SC-039）**：任意示範操作後，`teacherId` / `teacherName` / `little-helper-offline-data` 未被建立或變動（DevTools Application + 程式檢查）。
- **無 D1（SC-040）**：全程 Network 面板無寫 D1 請求。
- **斷網重連（SC-041）**：**production build** + 先在線載過 `/demo/helper`；關網登記→老師端不更新→斷網重整頁面仍載回且登記仍在→重連數秒內同步顯示「已同步」。
- **異常（SC-042）**：老師端「任務停擺」由 `detectAnomalies` 產生 `TASK_STALLED`（程式碼可追溯）。
- **多裝置隔離（SC-043）**：兩瀏覽器各開 `/demo` 互不影響。
- **靜態檢查**：`eslint` + `tsc --noEmit` 0 error。

---

## 8. 風險與已知限制

- **資料層抽換**（第 1.2）：若 `storage`/`syncController` 難乾淨參數化，方案 A 退 B，工作量上升；改動不得回歸正式小老師端路徑。
- **SW 前提**（第 1.5）：dev 無 SW，斷網重整白頁——US4 驗收只在 prod build 成立，需在文案/驗收說明標明。
- **BroadcastChannel**（第 1.3）：極少數 iOS < 15.4 環境同步時機退化；已用 feature-detect 兜底。
- **「同步需要網路」是模擬**：BroadcastChannel 不經網路，靠 `navigator.onLine` gate 出效果，非真上傳；hint 文案 MUST 保持「示範/模擬」語氣，不讓使用者誤以為 demo 真的上雲（vision 不黑盒）。

---

## 8b. 擴充（2026-07-31）：任務細節頁 + 多人經手展示（US7）

**動機**：原示範沒展示招牌特色「多人經手」（004 US4 順序處理者留痕）——老師端只有任務清單、小老師端座號固定。補上完整迴圈：小老師換座號重登同一生 → 老師端細節頁看到「多人經手」。

- **經手鏈規則單一真相**：把 `shouldAppendHandler`（原在 `recordWrite.ts`，但該檔 import `@/lib/db` → 無法進 client bundle）抽到**無伺服器相依的純模組 `src/lib/recordHandlerRule.ts`**，`recordWrite.ts` re-export（既有匯入點與測試不變）。demo store 直接 import 該規則維護鏈，確保 demo 判定與正式同源、可追溯（SC-045）。
- **demo store**：`DemoData` 加與 records 平行的 `handlers`（`applyToHandlers` 依規則追加 / 刪記錄時清鏈）；`upsertDemoRecord`（線上）、`flushDemoPending`、`applyDemoIncoming` 一併維護；`useDemoHandlers(taskId)` 供細節頁。
- **跨視窗**：`DemoSyncMessage` 加 `handlers` 欄位，broadcaster 簽名加第三參數，老師端 `applyDemoIncoming` 覆蓋鏈快照。
- **老師端細節頁**：**自寫平行 `DemoTaskDetail`**（不重用 `TaskResultView`——碰 `/api/records`、`HandlerTrail` 未匯出）；沿用 `teacher.taskDetail.*` / `report.*` 文案；in-page state（非新路由，保住 `BroadcastChannel`）。任務清單卡改為可點 `button`。
- **小老師端換座號**：`RecordForm` 已有的 `onChangeSeat` 接上重用 `SeatSelector` 的 modal → `setDemoSeat`；加引導 hint `demo.hint.multiHandler`。
- **驗證（本機 dev 實測通過）**：單分頁走 helper（座號 1 給陳冠宇 90 分 → 換座號 2 改 95 分）→ sessionStorage 鏈 = `[1,2]` → `/demo` 任務 B 細節頁該筆標「多人經手」、展開見「1 號→2 號」。ISO：`teacherId`/`teacherName`/`little-helper-offline-data` 皆 null、無 `/api/*` 請求。跨視窗即時同步仍需**桌機兩視窗真機驗**（同 tab window.open 無法並存兩 context）。tsc / eslint / recordWrite 測試皆過。

## 9. 文件影響

見 `spec.md`「文件影響」表。重點：`data-model.md` **無需更新**（不新增 entity、不落庫）；`ui-spec.md` 可補「示範模式標示帶 / 模擬視窗說明 / hint chip」視覺規範；`anomaly-rules.md` 可於沿革補一句「006 示範重用 `detectAnomalies`」，並另案修正第 96 行「規則一、二排除繳交類」與程式碼矛盾。收尾以 `spec-align` 複核。
