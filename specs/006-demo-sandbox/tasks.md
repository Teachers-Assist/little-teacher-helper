# Tasks: 006 推廣用示範沙盒 (Demo Sandbox)

**Input**: `specs/006-demo-sandbox/spec.md`、`plan.md`
**Prerequisites**: 001–005 已實作；手寫 Service Worker 已上線（`public/sw.js` + `ServiceWorkerRegistration.tsx`）
**Tests**: 不含自動化測試任務（與 001–004 一致）；隔離與斷網重連正確性以**手動驗證 task** 收尾，MUST 執行後才算完成

**Organization**: 按 Phase 分組；Phase 2+ 對齊 User Story，可獨立實作與驗收

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、無相依）
- **[Story]**: FND=地基, US1=獨立入口/標示帶, US2=種子班級/異常, US3=假QR/新視窗小老師端, US4=斷網重連同步, US5=建班邀請, US6=特色hint
- 描述 MUST 含確切檔案路徑

> **隔離守則（每個觸碰 storage / 網路的 task 送出前逐條自檢）**：
> - **ISO-1** MUST NOT 寫入或變動 `teacherId` / `teacherName` / `little-helper-offline-data`（FR-142）
> - **ISO-2** MUST NOT 呼叫任何 `/api/*`（demo 全本機，NFR-020）
> - **ISO-3** demo 狀態只進 sessionStorage `little-helper-demo`（NFR-019），關閉分頁即回收
> - **ISO-4** 跨視窗同步只靠 `BroadcastChannel`（含 `'BroadcastChannel' in window` feature-detect），MUST NOT 假設 sessionStorage 互通（`window.open` 是複製非共享）

---

## Phase 1: Foundational（地基）

**Goal**: 定案資料層抽換方案，備好種子、demo store、跨視窗頻道、i18n。

- [x] T601 [FND] **前置盤點（plan §1.2 的 T0）**：讀 `src/lib/offline/storage.ts`、`syncController.ts`，判斷能否乾淨參數化「storage 載體」與「上傳目標」→ 定案方案。**結論：定案方案 B（B2 平行 demo store）**；否決 A（storage.ts 模組單例 + key 寫死 + 正式路徑重度依賴，參數化回歸風險高）。佐證：`RecordForm` 等子元件 props-driven、資料 hooks 集中 page 層，重用度高。詳見 `plan.md` §1.2 <!-- 2026-07-29 盤點完成 -->
- [x] T602 [FND] [P] 新增 `src/lib/demo/seed.ts`：五年二班 6 位學生（座號 1–6，化名）+ 三任務——A 校外教學同意書（SUBMISSION，4/6 已交）、B 數學小考（GRADE，數位有成績）、C 午餐費（SUBMISSION，零登記，`createdAt = now − 25h` 觸發停擺）；時間戳一律相對 `now` 計算。**固定字串 id 供跨視窗對齊** <!-- 2026-07-29 完成，tsc/eslint 通過 -->
- [x] T603 [FND] demo store（方案 B2）：新增 `src/lib/demo/store.ts`——sessionStorage `little-helper-demo` 反應式 store，hooks 鏡像 `useOffline*`（`useDemoRoom/Students/Tasks/Task/Records/Seat/SyncStatus`），overlay（records ⊕ pending）、online gate、broadcaster 注入、`resetDemo`。**ISO-1/ISO-3** <!-- 2026-07-29 完成，tsc/eslint 通過 -->
- [x] T604 [FND] [P] 新增 `src/lib/demo/channel.ts`：`BroadcastChannel` 封裝——頻道名帶 demo session id（隔離多分頁）、feature-detect（不支援回無操作殼）、`close()`。**ISO-4** <!-- 2026-07-29 完成，tsc/eslint 通過 -->
- [x] T605 [FND] [P] i18n：`demo.*` + `landing.tryDemo*` 於 `src/messages/zh-TW.ts` / `en.ts`（已落地、tsc 通過）

**Checkpoint**: 方案定案、種子可載、demo store 讀寫走 sessionStorage、頻道可收發 → 可進 User Story

---

## Phase 2: User Story 1 — 獨立入口且明確是 demo (P1)

**Goal**: `/demo` 骨架 + 常駐標示帶 + 首頁次要入口，且全程不碰正式身份。

- [x] T606 [US1] 新增 `src/app/demo/page.tsx` 骨架 + 常駐**示範模式標示帶**（`demo.banner.title/desc`）+「建立我自己的班級」（`teacher.createRoom`→`/teacher`）+「還原狀態」（`demo.banner.restart`，`resetDemo` 清回種子＝FR-151）。版面用**首頁式自訂容器**（全寬老師端舞台，非窄版 `.lp-body-narrow`；未用 `.page-*`，不違反 ui-spec） <!-- 2026-07-29 完成，dev 實測：標示帶渲染、還原狀態寫 sessionStorage 種子、不碰正式 key -->
  - 內容區（班級狀況/三任務/顯示 QRCode）為佔位 `.empty-state`，待 US2/US3 接入
- [x] T607 [US1] [P] 修改 `src/app/HomePage.tsx`：新增「試用看看」**次要**入口（`landing.tryDemoTitle/Desc`→`/demo`，`play-circle` 圖示），弱連結層級低於兩張角色卡按鈕（FR-141） <!-- 2026-07-29 完成，dev 實測入口出現於角色卡下方 -->
- [ ] T608 [US1] 全程隔離自檢（ISO-1）：`/demo` 任何操作不建立/變動 `teacherId`/`teacherName`/`little-helper-offline-data`（驗證掛 T621）

**Checkpoint**: 首頁可進 `/demo`、標示帶常駐、localStorage 三 key 未動

---

## Phase 3: User Story 2 — 種子班級與三特色任務（含異常）(P1)

**Goal**: 老師端呈現種子班級狀況與三任務，異常由真函式算出。

- [x] T609 [US2] `/demo` 老師端呈現種子班級狀況（**重用 `MonitoringStats`**）+ 三任務清單（各任務進度 N/6，badge 區分繳交/成績型）；資料源 = demo store `useDemoTeacherView` <!-- 2026-07-29 完成，dev 實測 -->

- [x] T610 [US2] 異常：`useDemoTeacherView` 對種子跑真實 `detectAnomalies`（基準 `SEED_NOW`），任務 C 產生 `TASK_STALLED`；以**自寫紅色異常卡片**呈現（不重用 `MonitoringAlerts`——它有 `router.push('/teacher/...')` 副作用不適用 demo），文案沿用 `classStatus.anomalyIdle`（FR-145 / SC-042）。dev 實測顯示「已經 25 小時沒有新的登記了」 <!-- 2026-07-29 完成 -->
- [x] T611 [US2] [P] 任務 A 全班繳交狀況 4/6（社會壓力數字）✓、任務 B 以「成績」badge + 登記進度區分型別 ✓。**成績「只能填數字」的資料型別特色，改於小老師端登記畫面（`RecordForm`，US3/US4）體現**——老師端舞台維持精簡進度呈現 <!-- 2026-07-29 完成（範圍：老師端進度+型別區分；成績數值輸入體驗留小老師端） -->

**Checkpoint**: 三任務各體現一特色，停擺警示由 `detectAnomalies` 真算

---

## Phase 4: User Story 3 — 假 QRCode → 新視窗小老師端 (P1)

**Goal**: 出示假 QRCode，畫面內按鈕開新視窗載入小老師端示範。

- [ ] T612 [US3] `/demo` 加「顯示 QRCode」（`teacher.showQrcode`）→ 彈出出示畫面（重用 `QRCodeModal` 樣式）：**假 QRCode**（僅呈現）+ 下方按鈕「用新視窗模擬小老師端」（`demo.qr.openHelperBtn`）+ 說明（`demo.qr.fakeHint`）
- [ ] T613 [US3] 開窗：`window.open('/demo/helper', 尺寸/位置)`；被彈窗攔截 → 顯示 `demo.qr.popupBlocked`（US3 AS6，不靜默、不退同頁）；手機為新分頁（不做同頁 fallback，US3 AS5）
- [ ] T614 [US3] 新增 `src/app/demo/helper/page.tsx`：頂部**模擬說明**（`demo.helper.simNotice`）+ 重用小老師端呈現（進場/選座號/登記，方案 A/B）；資料源 = demo store。**ISO-1/ISO-2/ISO-3**

**Checkpoint**: 桌機新視窗、手機新分頁均能開小老師端；頂部標明「模擬」；小老師端可選座號、看到種子任務

---

## Phase 5: User Story 4 — 斷網 → 登記 → 重整資料仍在 → 重連同步 (P1)

**Goal**: 真實網路狀態驅動同步時機；斷網重整靠現有 SW；跨視窗 broadcast。

- [ ] T615 [US4] 跨視窗同步：小老師端登記 → 經 `channel.ts` broadcast → 老師端視窗更新對應任務班級狀況（FR-149）。**ISO-4**
- [ ] T616 [US4] `navigator.onLine` gate（重用 `useNetworkStatus`）：離線登記標「待同步」（重用 `SyncIndicator` 三態）且 **hold 不 broadcast**；`online` 事件才依序 flush；在線登記近即時反映（FR-148）
- [ ] T617 [US4] [P] 小老師端文字提示引導「關網→登記→重整看資料還在→重連看同步」（`demo.hint.offline` / `demo.hint.reconnect`）；MUST NOT 提供假斷線/重連按鈕
- [ ] T618 [US4] **手動驗證（SC-041，MUST 於 production build + 先在線載過 `/demo/helper`）**：關網登記→老師端不更新→斷網重整頁面仍載回且登記仍在→重連數秒內顯示「已同步」。未過不得視為完成

**Checkpoint**: 斷網重整不白頁、資料不消失、重連自動同步到老師端

---

## Phase 6: User Story 6 — 隨畫面變化的特色 hint (P2)

- [ ] T619 [US6] 特色 hint 元件：依當前路由/畫面顯示**單則** hint——老師端異常畫面用 `demo.hint.anomaly`、小老師端用離線引導（`demo.hint.offline`）；可關/輪替；與標示帶、邀請**視覺與功能分離**（US6 AS4 / SC-044）

---

## Phase 7: User Story 5 — 柔性建班邀請 (P2)

- [ ] T620 [US5] 完成一次示範同步後，以**非攔截式**提示（`demo.invite.text`）邀請建班→`/teacher`（沿用 `teacher.createRoom` 低摩擦入口）；可忽略、不重複強推；MUST NOT 強制 modal / 倒數 / 廣告

---

## Phase 8: 隔離與無汙染驗證（收尾）

- [ ] T621 **手動驗證（SC-039 / SC-040 / SC-043）**：任意示範操作後——(a) DevTools 檢查 `teacherId`/`teacherName`/`little-helper-offline-data` 未建立或變動；(b) Network 面板全程無寫 D1 請求；(c) 兩瀏覽器各開 `/demo` 操作互不影響。**未過不得視為完成**
- [ ] T622 靜態檢查：`eslint .` + `tsc --noEmit` 0 error

---

## Dependencies & 平行化

- **Phase 1 先行**：T601（gate）→ T603；T602 / T604 / T605 可平行。
- **Phase 2–4 需 Phase 1**：T606 需 demo store；T607 可與 T606 平行。
- **US2（Phase 3）需種子 + 老師端骨架（T606）**。
- **US3（Phase 4）需 T606**；T614 需 demo store（T603）。
- **US4（Phase 5）需 T614（小老師端）+ T604（channel）**；T615→T616 序列，T617 可平行。
- **US6 / US5（Phase 6/7）需對應畫面就緒**，屬 P2、可最後做。
- **Phase 8 驗證**在功能齊備後執行；T618 與 T621 皆須 production build 相關情境。

## 建議實作路徑（MVP 優先）

T601 → T602/T604 → T603 → T606/T607（可先看到入口與標示帶）→ T609/T610/T611（老師端價值）→ T612/T613/T614（小老師端）→ T615/T616/T617（同步招牌）→ T619 → T620 → T618/T621/T622（驗收）。
