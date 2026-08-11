# Tasks: 004 警示、證據與回饋機制 (Alerts & Feedback)

**Input**: `specs/004-alerts-and-feedback/spec.md`、`plan.md`
**Prerequisites**: 001 / 002 / 003 已實作完成，本 feature 在其上補齊與修正
**關聯**: `specs/offline-sync-remediation.md` —— **與本 feature 交錯進行**（Overlay 前置 Phase 1、版本戳併入 US1、臉 D 併入 US3）

**Tests**: 不含自動化測試任務（與 001/002/003 一致）；但**同步／儲存正確性 task 附「手動驗證」子項**（對應 remediation RC-1 ~ RC-8），MUST 執行後才算完成

**Organization**: Tasks 按 Phase 分組，Phase 2+ 對齊 User Story，可獨立實作與驗收

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、無相依）
- **[Story]**: US1=同步失敗出口, US2=老師端誠實, US3=學生端存檔回饋, US4=紀錄留痕, US5=生命週期語意, US6=異常規則重整, US7=承諾核對, US8=規則三, US9=載入時提示；REM=remediation 修復項
- 描述 MUST 包含確切檔案路徑

> **同步正確性守則（每個觸碰 offline/sync 的 task 送出前逐條自檢）**：INV-1 未送出資料不得靜默移除 / INV-2 重試判定不持久化、載入即重置 / INV-3 兩層各一 owner（overlay）/ INV-4 不套用陳舊決策（先驗 rev）/ INV-5 不謊報已同步 / INV-6 計算層排除 isRemoved 不刪 records / INV-7 detectAnomalies 維持純函式。完整定義見 `plan.md` 第 2 節。

---

## Phase 1: Foundational（共用地基 + remediation 前置）

**Goal**: 打好三塊地基——(a) Overlay 模型（US1/US9 的真前置，remediation 藥方一）、(b) API 錯誤碼統一（US1/US3 前置）、(c) RecordHandler schema（US4 前置，提前落地以免舊紀錄補不回）、(d) detectAnomalies 純函式介面骨架 + 時區工具（US6/US8 前置）。

> **動工前**：依當下程式碼重讀 `offline-sync-remediation.md` §3、§6，核對 `store.ts`/`queue.ts`/`storage.ts` 的行號與簽名（remediation 行號為 2026-07-26 快照，可能已位移）。

### (a) Overlay 模型 — remediation 藥方一（臉 B、臉 C-record）

- [x] T301 [REM] 在 `src/types/index.ts`：`OfflineRecordEntry` 移除 `synced` 欄位（改由「佇列裡有沒有待送 op」派生）；確認 `OfflineSyncQueueItem` 結構供 T313 加 `rev` <!-- 2026-07-27 已實作 -->
- [x] T302 [REM] 修改 `src/lib/offline/store.ts` 的 `useOfflineRecords`：由「回 `data.records[taskId]` 快取」改為**疊加 selector**——讀 `data.records`（base）＋ `data.syncQueue`（overlay），對每個 `(taskId, studentId)`：佇列有待送 op 顯示 op 值（刪除 op 顯示成「沒登記」），否則顯示 base（INV-3） <!-- 2026-07-27 已實作（mergeRecords） -->
- [x] T303 [REM] 修改 `src/lib/offline/queue.ts` 的 `queueRecordUpdate`：**移除 `saveRecord`/`removeRecord` 呼叫**，改為只入佇列（`addToSyncQueue`）；`records` 快取自此只由 `cacheSyncedRecords` 寫入（INV-3） <!-- 2026-07-27 已實作 -->
- [x] T304 [REM] 清理 `src/lib/offline/storage.ts`：`saveRecord`/`removeRecord` 若僅服務登記路徑則移除；`cacheSyncedRecords` **保留**（base 唯一寫入者，仍可整包覆蓋鏡像） <!-- 2026-07-27 已實作（saveRecord/removeRecord 已移除） -->
- [ ] T304a [REM] **同步正確性驗證（RC-2 / RC-3）**：離線登記數筆 → 觸發 refetch（`cacheSyncedRecords` 整包覆蓋 base）→ 畫面 MUST 仍顯示離線登記值、取消登記 MUST NOT 被「復活」；送出期間持續 `saveRecord`/`addToSyncQueue` → reconciliation MUST NOT 把新值標為已同步。**未過不得進 Phase 2** <!-- 邏輯已由 overlay.test.ts/queue.test.ts 覆蓋；瀏覽器手動走查未跑，故維持未勾 -->

### (b) API 錯誤碼統一（FR-111 ~ FR-113）

- [x] T305 [P] 在 `src/i18n/errorCodes.ts` 的 `ERROR_CODES` 新增：`TASK_LOCKED`、`TASK_NOT_FOUND`、`RECORD_VALIDATION_FAILED`、`STUDENT_NOT_IN_ROOM`（message 路徑見 plan §3.3；學生端可見者指向兒童語氣文案，`RECORD_VALIDATION_FAILED` 沿用既有 `record.saveFailed`） <!-- 2026-07-27 已實作（含 NON_RETRYABLE_ERROR_CODES 集合） -->
- [x] T306 修改 `src/app/api/sync/route.ts`：所有錯誤回應改走 `ERROR_CODES`——`conflicts[].reason` MUST 回碼值（供 FR-078 分類）、各 400/404/500 的 `error` 欄位不得回硬編中文 <!-- 2026-07-27 已實作 -->
- [x] T307 修改 `src/app/api/records/route.ts`：`errors[].reason` 與各錯誤 `error` 欄位改走 `ERROR_CODES`（同 T306） <!-- 2026-07-27 已實作 -->
- [x] T308 [P] 在 `src/messages/zh-TW.ts` 與 `en.ts` 補上 T305 新碼對應的兒童語氣文案（`sync.taskLocked` / `sync.taskNotFound` / `sync.studentRemoved` 等），確認 `resolveError()`（`src/i18n/resolveError.ts`）可解析 <!-- 2026-07-27 已實作（zh-TW + en 皆有） -->

### (c) RecordHandler schema（US4 前置）

- [x] T309 [P] 在 `prisma/schema.prisma` 新增子表 `RecordHandler`：`recordId`（FK→Record）、`seatNumber`、`handledAt`；`Record` 1:N `RecordHandler`；不新增 `Record` 純量欄位（`recorderSeatNumber`/`updatedAt`/`isAssignedRecorder` 皆維持現狀，見 plan §3.6） <!-- 2026-07-27 已實作（RecordHandler 子表已落地（Drizzle src/db/schema.ts；recordWrite.ts 寫入）） -->
- [x] T310 在 root 執行 `pnpm prisma db push`（**不寫 migration 檔**，sqlite `dev.db`）；確認既有紀錄不因新增子表而失敗（NFR-014） <!-- 2026-07-27 已實作（表已隨 Drizzle+D1 遷移落地；任務原文 prisma db push 已過時） -->
- [x] T311 [P] 在 `src/types/index.ts` 補 `RecordHandler` 型別與 `Record` 的 handlers 關聯 <!-- 2026-07-27 已實作（RecordHandler 型別存在（types/index.ts）） -->

### (d) 異常偵測介面骨架 + 時區工具（US6/US8 前置）

- [x] T312 [P] 新增 `src/lib/timezone.ts`：`taipeiDayStartAt(date, hour)` 回傳「該日期台北時區 hour:00」對應的 UTC `Date`（固定 +08:00、無 DST）；供規則二（hour=8）與截止寫入（hour=17）共用（NFR-016） <!-- 2026-07-27 已實作（timezone.ts taipeiDayStartAt 已實作） -->
- [x] T313 [REM] 在 `src/types/index.ts` 為 `OfflineSyncQueueItem` 新增 `rev: number`（新建 op = 0；供 US1 版本戳用） <!-- 2026-07-27 已實作（另含 nonRetryable） -->

**Checkpoint**: Overlay 地基綠燈（T304a 通過）、錯誤碼可分類、schema 就緒、時區工具可用 —— 可開始 User Story

---

## Phase 2: User Story 1 — 同步失敗要有出口 (Priority: P1)

**Goal**: 解析 `/api/sync` 的 `conflicts`、區分可重試／不可重試、重試耗盡升級為「找老師」、`SyncIndicator` 補失敗態。**版本戳（remediation 臉 A/C-op）併入本次同一段 reconciliation 改寫。**

**Independent Test**（Overlay 落地後才有效）: 任務鎖定 → 離線登記數筆 → 恢復連線 → sync 回 409 → `SyncIndicator` 顯示失敗態（非停在「N 筆待上傳」）→ 提示指出送不出去且找老師 → 重整後失敗態仍在、資料不消失

### 佇列與同步邏輯（版本戳併入）

- [x] T314 [US1][REM] 重寫 `src/lib/offline/queue.ts` 的 `processSyncQueue` reconciliation（**一次改到位，避免雙 churn**）： <!-- 2026-07-27 已實作（reconcileSync 純函式：sentRev/attemptedIds/rev 條件式套用 + conflicts 分類） -->
  - 解析 `/api/sync` 回傳的 `conflicts`（207 與 409 皆是），MUST NOT 只讀 `operationIds`（FR-077）
  - 依 `ERROR_CODES` 碼值分類可重試／不可重試（FR-078），MUST NOT 用中文文字比對；不可重試立即停止重試
  - **版本戳條件式套用**：送出前記 `sentRev` 對照表；回應到達時只有 `op.rev === sentRev[op.id]` 才 ack 移出，否則保留待下輪送最新 payload（INV-4/INV-5）
  - `addToSyncQueue` 去重就地換 payload 時 `rev++`（臉 A 藥方）
  - 兩次讀取合併為「送出前記 sentRev 快照 → 送出 → 回應後以當前 `getOfflineData()` + sentRev 比對套用」（臉 C-op）
- [x] T315 [US1] 修改 `processSyncQueue` 的放棄路徑（FR-079）：重試達上限或不可重試者 MUST NOT 靜默從佇列濾除（INV-1）；MUST 保留並標記狀態供 UI 讀取 <!-- 2026-07-27 已實作（reconcileSync 一律保留、標 nonRetryable/retryCount；isOpFailed 供 UI） -->
- [x] T316 [US1] 修改 `src/lib/offline/syncController.ts` 與登記頁 `load()`：頁面載入時**重置** `retryCount` 與不可重試標記並觸發一次重試（FR-079 / INV-2）；**未送出的佇列資料不清除**（NFR-013）—— 支援老師重新開放任務後學生重整即自動恢復（Edge Case） <!-- 2026-07-27 已實作（resetRetryJudgment 於 page.tsx load() 呼叫） -->
- [x] T317 [US1] `/api/sync`（`src/app/api/sync/route.ts`）確認對「已移除學生 / 已封存或刪除任務」回傳對應衝突碼（FR-078 / AS8），走上述流程被學生看見而非靜默丟棄 <!-- 2026-07-27 已實作（STUDENT_NOT_IN_ROOM / TASK_LOCKED / TASK_NOT_FOUND conflicts） -->

### UI（失敗態）

- [x] T318 [US1] 修改 `src/components/SyncIndicator.tsx`：新增**失敗態**（與「同步中」「待上傳」視覺可區分），顯示受影響筆數（FR-081）；失敗態文案指向「去找老師」（沿用 003 FR-065 升級模式，FR-082） <!-- 2026-07-27 已實作（failedCount 優先態 + messages.sync.failed） -->
- [x] T319 [P] [US1] 在 `src/messages/zh-TW.ts`、`en.ts` 新增同步失敗態文案（指出 N 筆送不出去 + 下一步找老師；文案定稿 #1） <!-- 2026-07-27 已實作（sync.failed，zh-TW + en） -->
- [x] T319a [US1] 佇列 op 保留 `failReason`（`reconcileSync` 寫入、`resetRetryJudgment` 清除），新增 `dominantFailReason` 優先序純函式，`SyncIndicator` 以 `resolveError` 顯示成因文案（FR-112a） <!-- 2026-08-10 測試回饋問題二：座號被移除卻只顯示「有 N 筆送不出去」 -->

### 同步正確性驗證

- [ ] T320 [US1][REM] **手動驗證（RC-1 / RC-4 前置）**：成績類任務，同步飛行中連續改 v1→v2、mock `/api/sync` 慢回 v1 成功 → 佇列 MUST 仍保有 v2 並於下輪送出、伺服器最終值 MUST 為 v2、指示器 MUST NOT 在 v2 未送出時顯示「已同步」（INV-5）；重整後未送出資料仍在（US1 AS7） <!-- 邏輯已由 queue.test.ts 覆蓋；瀏覽器手動走查未跑，故維持未勾 -->

**Checkpoint**: 資料不再靜默消失、也不靜默分歧；失敗有出口

---

## Phase 3: User Story 2 — 老師看到的狀態必須誠實 (Priority: P1)

**Goal**: 區分「已確認無異常」與「無法確認」；補 002 AS3 的時間/閾值資訊；dashboard 異常數無法取得時顯示 `—`。**本 US 不碰同步層，可與 Phase 2 平行。**

**Independent Test**: monitoring 回 500 → 班級狀況 tab MUST NOT 顯示「目前沒有需要注意的事」、MUST 顯示「無法確認」+重試；恢復後卡片帶時間/閾值資訊

- [x] T321 [US2] 修改 `src/app/teacher/rooms/[id]/page.tsx`（班級狀況 tab）：monitoring fetch 非 2xx 或拋錯時，`warnings` MUST NOT 落入空陣列空狀態（現況 `page.tsx:143` 只 `console.error`）；改為傳遞「無法確認」狀態（FR-083） <!-- 2026-07-27 已實作（page.tsx network/server 無法確認態） -->
- [x] T322 [US2] 修改 `src/components/MonitoringAlerts.tsx`：新增「無法確認」呈現 + 重試入口；區分「連線問題（老師離線）」與「伺服器錯誤」兩種文案（FR-084 / AS6；文案 #2、#3） <!-- 2026-07-27 已實作（MonitoringAlerts 無法確認呈現 + 重試） -->
- [x] T323 [US2] 修改 `src/components/MonitoringAlerts.tsx`：警示卡片渲染時間/閾值——`ASSIGNED_SEAT_IDLE` 顯示已閒置時長（閾值 24h）、`NO_RECORDS_NEAR_DUE` 顯示截止或剩餘時間（`dueDate` 已在 props 未渲染）（FR-085 / 補 002 AS3） <!-- 2026-07-27 已實作（MonitoringAlerts 渲染 idleMs / dueDate） -->
- [x] T324 [US2] 修改 `src/app/teacher/page.tsx`（dashboard）與其資料源：異常統計數字在資料無法取得時顯示 **`—`**，MUST NOT 顯示 0、MUST NOT 顯示過期值（FR-086）；與班級狀況 tab 採一致的無法確認呈現（AS5） <!-- 2026-07-27 已實作（dashboard 無法取得時顯示 —） -->
- [x] T325 [US2] 學生端伺服器錯誤（500）統一用「網頁出現問題」語氣，MUST NOT 沿用成人化「請稍後再試」（AS7；文案 #4）—— 確認 `resolveError()` catch-all 文案符合此語氣 <!-- 2026-07-27 已實作（學生端 server 錯誤態文案） -->
- [x] T326 [P] [US2] 在 `src/messages/zh-TW.ts`、`en.ts` 新增無法確認相關文案（連線問題 / 伺服器錯誤 / 重試） <!-- 2026-07-27 已實作（無法確認文案 zh-TW + en） -->

**Checkpoint**: 老師端不再謊報平安

---

## Phase 4: User Story 6 — 異常偵測規則重整 (Priority: P1)

**Goal**: 規則一改任務層級活動（滑動視窗、移除指定座號前置）、規則二改絕對時鐘（截止日 08:00）、截止預設 17:00。**US7/US8 的口徑前置。**

**Independent Test**: 無指定無截止任務 24h → 出現停擺警示；登 3 筆後靜置 24h → 再現警示；全班登滿靜置 24h → 不警示；截止隔天零登記 → 隔天 08:00 起警示

- [x] T327 [US6] 修改 `src/lib/anomalyDetection.ts` 規則一：改判**任務層級活動**、移除 `assignedSeatNumber != null` 前置；閒置自**最後一次登記活動**起算、無登記時退回 `createdAt`（滑動視窗）（FR-102 / FR-103） <!-- 2026-07-27 已實作（anomalyDetection 規則一 TASK_STALLED（任務層級滑動視窗）） -->
- [x] T328 [US6] `detectAnomalies` 新增輸入「班級學生總數」；登記筆數達班級學生總數時不判停擺（FR-104）。分母只計 `isRemoved=false`、分子排除移除學生紀錄（INV-6）；**records 不因移除而刪** <!-- 2026-07-27 已實作（detectAnomalies 班級總數輸入、登滿不判、排除 isRemoved） -->
- [x] T329 [US6] 移除 `detectAnomalies` 的 `assignedRecorderHasRecord` 輸入；移除 `src/app/api/rooms/[id]/monitoring/route.ts` 中對應的 `distinct` 查詢（FR-105） <!-- 2026-07-27 已實作（移除 assignedRecorderHasRecord / distinct） -->
- [x] T330 [US6] 修改 `src/lib/anomalyDetection.ts` 規則二：改用絕對時鐘——截止日當天 **08:00（`Asia/Taipei`，用 T312 工具）** 起、全班零登記即判（取代「距截止 6h」）；僅適用截止日當天 08:00 **之前**已建立的任務（FR-106 / FR-107）。時間換算在 endpoint 做、純函式只比較（INV-7） <!-- 2026-07-27 已實作（規則二 NO_RECORDS_BY_DUE 絕對時鐘 08:00） -->
- [x] T331 [US6] 修改 `src/components/TaskForm.tsx`：`dueDate` 寫入由硬編 `T23:59:59` 改為台北 **17:00**（用 T312 工具）；**延長截止**設定的新日期同樣正規化為 17:00（FR-108 / Edge Case）。既有 23:59:59 任務不 migration（FR-109） <!-- 2026-07-27 已實作（TaskForm taipeiDayStartAt(due,17)） -->
- [x] T331a [US6] 修改 `monitoring/route.ts` 與 dashboard endpoint 的 `recordedCount`：由 `task._count.records`（含移除學生）改為 `_count` 加 `where: { student: { isRemoved: false } }`（分子排除移除學生，INV-6） <!-- 2026-07-27 已實作（monitoring recordedCount 排除 isRemoved） -->
- [x] T331b [P] [US6] 修改 `anomalyAssignedSeatIdle` 文案：由「指定座號 N 已超過 24 小時沒有登記」改為描述**任務停擺**而非特定座號（FR-110；文案 #11，實作後定） <!-- 2026-07-27 已實作（停擺文案改任務層級（TASK_STALLED）） -->

**Checkpoint**: 涵蓋矩陣無空格（SC-025）；截止 17:00 鎖定生效

---

## Phase 5: User Story 3 — 登記當下存不存得起來 (Priority: P2)

**Goal**: `persist()`/`handleMarkComplete`/`saveOfflineData` 失敗不再靜默；接上 dead string `record.saveFailed`。**臉 D（handleMarkComplete 陳舊快照回捲）併入 T332 同一次改。**

**Independent Test**: 勾選學生 → mock `queueRecordUpdate` 失敗 → 顯示 `record.saveFailed`；按「我登記完了」→ mock 500 → 顯示失敗且按鈕復位；塞爆 localStorage → 顯示存不下來 + 找老師

- [x] T332 [US3][REM] 重寫 `src/app/helper/[roomId]/[taskId]/page.tsx` 的 `handleMarkComplete`：非 2xx 或拋錯時顯示失敗回饋、按鈕復位（FR-088）；區分「沒網路」與「其他錯誤」（AS3；文案 #5）。**臉 D 併改**：`await` 後 MUST NOT 用閉包舊 `task` 拼 `saveTask`，改以回應內容或最新 store 值更新 status（INV-4） <!-- 2026-07-27 已實作（handleMarkComplete 失敗回饋 + 臉D（res.json 不用閉包 task）） -->
- [x] T333 [US3] 修改 `src/lib/offline/queue.ts` 的 `persist()`（或登記頁呼叫處）：`queueRecordUpdate` 回 `{ok:false}` 時顯示 `messages.record.saveFailed`（接既有 dead string），MUST NOT 靜默 return（FR-087） <!-- 2026-07-27 已實作（persist 顯示 record.saveFailed） -->
- [x] T334 [US3] 修改 `src/lib/offline/storage.ts` 的 `saveOfflineData`：`localStorage.setItem` 失敗時向上傳遞失敗訊號，MUST NOT 僅 `console.error` 後 return（FR-089，現況 `storage.ts:105`） <!-- 2026-07-27 已實作（saveOfflineData 回傳 boolean） -->
- [x] T335 [US3] 在登記頁接住 T334 的失敗訊號：顯示「資料存不下來 + 找老師」提示（FR-090；文案 #6），提示持續可見直到問題解除、但 MUST NOT 阻擋操作（FR-091 / AS5） <!-- 2026-07-27 已實作（storageFull toast（result.stored===false）） -->
- [x] T336 [P] [US3] 在 `src/messages/zh-TW.ts`、`en.ts` 補標記完成失敗、本機存不下來文案 <!-- 2026-07-27 已實作（標記完成失敗 / 存不下來文案） -->
- [ ] T336a [US3][REM] **手動驗證（RC-4）**：`handleMarkComplete` 送出期間 `load()` 寫入新 task → 完成後 task MUST NOT 被舊快照回捲

> **注意（AS6）**：`GradeRow` 的數字驗證維持現狀、本 US 不改。已知 `GradeRow` 另有「`text` 只在 mount 初始化、不隨 prop 回填」缺陷（remediation A4）——**不在本 US 範圍**；已於 2026-07-27 提前另案修復（見 `offline-sync-remediation.md` §5 A4）

**Checkpoint**: 學生端所有 catch 都有使用者可見結果（SC-022）；dead string 已接線（SC-021）

---

## Phase 6: User Story 5 — 任務不見了要說對話 (Priority: P2)

**Goal**: 拆開「任務被刪/封存」「網路失敗」「未加入班級」三種成因的共用文案

**Independent Test**: 老師刪任務 → 學生重整顯示「任務被收起來」；離線無快取 → 顯示連線問題；清 localStorage 直開 → 才顯示未加入班級

- [x] T337 [US5] 修改 `src/app/helper/[roomId]/[taskId]/page.tsx`：任務 API 回 404 / 已封存 → 顯示「任務被老師收起來了、去問老師」，MUST NOT 顯示 `room.notFoundTitle`、MUST NOT 以「重新掃碼」為主要出口（FR-098 / AS1-2；文案 #9） <!-- 2026-07-27 已實作（page.tsx loadError 'gone'） -->
- [x] T338 [US5] 同檔：載入失敗成因為網路（fetch 拋錯或離線無快取）→ 顯示連線相關文案、指向「連上網路再試」，可沿用 `common.networkError`（FR-099 / AS3） <!-- 2026-07-27 已實作（loadError 'network'） -->
- [x] T339 [US5] 同檔：`room.notFoundTitle` 僅用於「本機無此房間紀錄」（FR-100 / AS4，維持現有行為） <!-- 2026-07-27 已實作（room.notFoundTitle 僅本機無房間） -->
- [x] T340 [US5] 修改 `src/app/helper/[roomId]/page.tsx`（任務清單頁）：比照 FR-098~100 區分網路問題與無資料（FR-101） <!-- 2026-07-27 已實作（清單頁 refreshError network/server） -->
- [x] T341 [US5] 離線登記於同步時發現任務已封存者：學生端視為**成功**（非衝突、不擋），以生命週期文案告知「這個任務老師已經收起來了」（用「已收起/已封存」非「遲交」）（FR-101a；文案 #10） <!-- 2026-07-27 已實作（封存離線同步視為成功 + 生命週期文案） -->
- [x] T342 [P] [US5] 在 `src/messages/zh-TW.ts`、`en.ts` 新增任務已收起 / 封存告知文案 <!-- 2026-07-27 已實作（任務已收起文案） -->

- [x] T342a [US5] 拆分 `src/lib/task.ts` 的 `getTaskLockReason`：`'COMPLETED'` 拆成 `'HELPER_COMPLETED'` / `'CLOSED'`，`RecordForm` 依三態分流文案，新增 `task.lockedClosedByTeacher`（AS6b） <!-- 2026-08-10 測試回饋問題一：老師結案時學生被告知「你已經標記完畢了」 -->

> 任務因截止或小老師自行標記完成而鎖定者，維持既有 `task.lockedDuePassed` / `task.lockedCompleted`（AS6 / AS6a）

**Checkpoint**: 三種成因三種對話（SC-024）

---

## Phase 7: User Story 8 — 完成但登記太少，要提醒老師 (Priority: P2)

**Goal**: 新增異常規則三——`HELPER_COMPLETED` 且登記率 < 50% 升老師端警示。**依賴 US6 的口徑與 detectAnomalies 分流。**

**Independent Test**: 成績類 30 人登 10 人後標完成 → 班級狀況 tab 出現異常卡片；登 20 人後標完成 → 無異常；繳交類 30 人只 8 人交後標完成 → 出現異常（繳交類納入）

- [x] T343 [US8] 在 `src/lib/anomalyDetection.ts` 新增**規則三**：`status === 'HELPER_COMPLETED'` 且登記率 < 50% 判異常（FR-120）；登記率口徑沿用 FR-104/FR-119（分子分母排除 `isRemoved`；繳交類分子＝SUBMITTED 筆數）（INV-6）；成績類與繳交類皆適用（FR-121，與規則一二相反） <!-- 2026-07-27 已實作（規則三 LOW_COMPLETION < 50%） -->
- [x] T344 [US8] 調整 `detectAnomalies` 的 `status !== 'ACTIVE'` early-return（`anomalyDetection.ts:43`）：規則一、二維持 ACTIVE-only、規則三獨立判 `HELPER_COMPLETED`（FR-122）；分母為 0 時不判（避免除以零，FR-123） <!-- 2026-07-27 已實作（early-return 調整、除零保護） -->
- [x] T345 [US8] 修改 `src/app/api/rooms/[id]/monitoring/route.ts` 與 dashboard endpoint：查詢範圍納入 `HELPER_COMPLETED` 任務（現行可能只撈 ACTIVE）（FR-122）；沿用純函式 `detectAnomalies`（INV-7） <!-- 2026-07-27 已實作（monitoring/dashboard 納入 HELPER_COMPLETED） -->
- [x] T346 [US8] 修改 `src/components/MonitoringAlerts.tsx`：規則三卡片顯示登記率與班級人數（例：已登記 10/30）+ 進任務詳情入口；文案描述「完成但登記偏少」，MUST NOT 沿用停擺/截止語意（FR-124 / AS5；文案 #13） <!-- 2026-07-27 已實作（規則三卡片顯示 N/M） -->
- [x] T347 [P] [US8] 在 `src/messages/zh-TW.ts`、`en.ts` 新增規則三異常卡片文案 <!-- 2026-07-27 已實作（規則三卡片文案） -->

> 規則三閾值 50% 為待觀察參數（FR-125）；過吵優先調閾值或改班級基準法，MUST NOT 移除規則三。規則三完整定義以 `specs/anomaly-rules.md` 為單一真實來源（已含規則三）

**Checkpoint**: `HELPER_COMPLETED` 空窗補上（SC-030 / SC-031）

---

## Phase 8: User Story 4 — 監視器：紀錄留痕與查閱 (Priority: P3)

**Goal**: 以 `RecordHandler` 子表（Phase 1 已建 schema）承載順序處理者名單；老師端可查、學生端覆蓋時 toast 陳述

**Independent Test**: 8 號登 5 號成績 → 12 號改同筆 → 5 號再改 → 老師端細節頁看得出 8→12→5 三手及時間 → 12 號操作當下看到「原本是 8 號登的」toast（800ms 自動消失、不阻擋）

### 寫入路徑（名單維護）

- [x] T348 [US4] 修改 `src/app/api/records/route.ts` 與 `src/app/api/sync/route.ts` 的 Record 寫入：每次處理（建立或修改）追加一筆 `RecordHandler`（座號, 時間）依 `handledAt` 排序（FR-092） <!-- 2026-07-27 已實作（sync/records 寫 RecordHandler（writeRecordWithHandler）） -->
- [x] T349 [US4] 同上：連續同座號去重——若名單最後一筆座號 === 本次座號則不追加相鄰重複項（FR-093 / 名單灌爆防護） <!-- 2026-07-27 已實作（連續同座號相鄰去重） -->
- [x] T349a [US4] `RecordHandler` 改以 `(taskId, studentId)` 為 key（migration `0002_record_handler_by_cell.sql`，backfill 既有列），新增 `action` 欄位；刪除登記改為**追加一筆 DELETE 經手**而非清鏈；`shouldAppendHandler` 去重同時比對座號與動作；老師端 / demo 展開時分開敘述刪除（FR-093a） <!-- 2026-08-10 測試回饋問題四：清空重打會抹掉經手鏈，多人經手因此漏標記 -->
- [x] T349b [US4] `RecordForm` 的 `GradeRow` 改 blur-only 送出（移除 500ms 計時器），與現值相同不送，並於 `pagehide` / `visibilitychange→hidden` / 卸載補送（FR-093b） <!-- 2026-08-10 打字中送出會讓暫時性空白變成真的刪除；計時器原本兼任的保命 flush 一併補回 -->
- [x] T350 [US4] 離線經手鏈（FR-097）：離線期間的（座號, 時間）隨 `/api/sync` 送出並依 `handledAt` 正確併入名單，MUST NOT 因離線遺失或錯置（在 `OfflineSyncQueueItem` 帶上 `handledAt` 供 server 併入） <!-- 2026-07-27 已實作（離線經手鏈 handledAt 隨 op 送出） -->

### 老師端查閱

- [x] T351 [US4] 修改 `src/components/TaskResultView.tsx`（或任務細節頁）：名單含 ≥ 2 個不同座號的紀錄提供可辨識標示 + 可展開顯示完整順序名單（各座號 + 時間）（FR-094 / SC-023） <!-- 2026-07-27 已實作（TaskResultView 多人經手展開） -->
- [x] T352 [US4] 同上：提升登記者資訊視覺重量，老師能一眼辨識「誰登的、有無混登、哪幾筆被不只一人動過」（FR-095，現況僅小字「登記者 N 號」） <!-- 2026-07-27 已實作（登記者資訊視覺重量提升） -->
- [x] T353 [US4] 封存後才同步進來的登記：老師端以**證據級**標示（被動可見、不主動喊）（FR-097a；文案 #8）；沿用 002 L232「照常寫入」 <!-- 2026-07-27 已實作（封存後進來標示（archivedAt 比對）） -->

### 學生端覆蓋 toast

- [x] T354 [US4] 修改 `src/app/helper/[roomId]/[taskId]/page.tsx` / `RecordForm.tsx`：覆蓋他人紀錄時以陳述句 toast 告知原登記者（名單第一筆）（FR-096；文案 #7）——沿用既有 Toast 元件，右上角、**800ms 自動消失**、非警告色、不阻擋、不需手動關閉（AS6-7） <!-- 2026-07-27 已實作（覆蓋 toast.info 800ms） -->
- [x] T355 [US4] 確認 T354 的觸發前提：依賴本機已有他人記錄可比對（線上載入/已快取，靠 Overlay 的 base）；**離線且無他人記錄快取時 toast 不觸發**（FR-096 / Edge Case「離線覆蓋僅老師端可見」）——此情境問責由 T348 的老師端名單於同步後承接，學生端**不做**同步後補告知 <!-- 2026-07-27 已實作（離線無他人快取不觸發） -->
- [x] T356 [P] [US4] 在 `src/messages/zh-TW.ts`、`en.ts` 新增覆蓋陳述句、封存後進來標示文案 <!-- 2026-07-27 已實作（覆蓋 / 封存文案） -->

**Checkpoint**: 覆蓋可見、可查（完整經手鏈，SC-023）

---

## Phase 9: User Story 7 — 標記完成前，先照一次現實 (Priority: P3)

**Goal**: 成績類任務登記未滿時，按「我登記完了」先出承諾確認提示。**純學生端、無 schema 變更；口徑沿用 US6 FR-104。**

**Independent Test**: 成績類 30 人登 20 人後按完成 → 出現「還有 10 個沒登記、完成後不能自己改」+兩出路 → 選繼續 → 照常完成；登滿 30 後按完成 → 不提示；繳交類未滿後按完成 → 不提示

- [x] T357 [US7] 修改 `src/app/helper/[roomId]/[taskId]/page.tsx` 的 `handleMarkComplete`（Phase 5 已重寫，此處疊加）：送出 `HELPER_COMPLETED` 前比對登記筆數與班級學生總數（皆排除 `isRemoved`，沿用 FR-104 口徑、不另立第二套，INV-6/FR-119）；成績類且未達班級人數時先顯示承諾確認提示，MUST NOT 直接送出（FR-114） <!-- 2026-07-27 已實作（markCompleteGapCount 承諾核對） -->
- [x] T358 [US7] 承諾確認提示（沿用既有 ConfirmDialog 或 Toast 型 UI）：陳述句指出尚有 N 位未登記 + 說明完成後鎖定需找老師重開（指向概念）（FR-115；文案 #12）；兩出路「繼續標記完成」（照常送出）/「先回去補登」（返回、不留鎖定）（FR-116） <!-- 2026-07-27 已實作（承諾確認 ConfirmDialog 兩出路） -->
- [x] T359 [US7] 登滿全班時不顯示提示、直接完成（FR-117 / 避免「一律彈確認」反例）；繳交類 MUST NOT 觸發（FR-118 / 假陽性同源） <!-- 2026-07-27 已實作（登滿 / 繳交類不觸發） -->
- [x] T360 [US7] 離線時登記率以本機可見資料（Overlay 疊加值）推算；快取不準 MUST NOT 阻擋標記完成（FR-114 註 / AS7） <!-- 2026-07-27 已實作（離線以 overlay 值推算、不阻擋） -->
- [x] T361 [P] [US7] 在 `src/messages/zh-TW.ts`、`en.ts` 新增承諾確認提示文案（含兩出路） <!-- 2026-07-27 已實作（承諾提示文案） -->

**Checkpoint**: 承諾當下有現實核對（SC-028 / SC-029）

---

## Phase 10: User Story 9 — 進任務前，先知道有沒有人做過 (Priority: P3)

**Goal**: 載入/重連時若任務已有「非自己座號」記錄，開始登記前陳述提示。**依賴 Overlay（否則資料不穩）；用既有 endpoint、不新增資料流。**

**Independent Test**（Overlay 落地後才有效）: B 在裝置二登 20 筆並同步 → A 上線開任務 → 開始登記前看到「座號 8 已登 20/30，要接手嗎」+兩出路；A 只有自己登過或全新 → 不提示；A 離線無快取 → 不提示不阻擋

- [x] T362 [US9] 修改 `src/app/helper/[roomId]/[taskId]/page.tsx`：`load()` 後判斷本機/剛同步資料是否有「非自己座號」記錄（沿用既有 `/api/records` 的 `recorderSeatNumber` 與 `/api/tasks` 的 `recordedCount`/`totalCount`，經 Overlay base 讀取），有則開始登記前顯示陳述提示指出座號 X 登了 N/M（FR-126；文案 #14） <!-- 2026-07-27 已實作（alreadyRecorded load() 後判斷一次） -->
- [x] T363 [US9] 提示提供「接手繼續」與「返回任務清單」兩出路，MUST NOT 阻擋進入或登記（FR-127 / AS2）；呈現形式（進入前 dialog 或常駐 banner）依 ui-spec，但不阻斷 <!-- 2026-07-27 已實作（接手 / 返回兩出路） -->
- [x] T364 [US9] 任務全新無記錄、或既有記錄全由本人座號所登時不顯示（FR-128 / 避免「一律彈確認」反例）；A 是指定小老師但已有他人代登時仍顯示（AS4） <!-- 2026-07-27 已實作（全新或自己登過不顯示） -->
- [x] T365 [US9] A 離線且本機無此任務記錄快取時不顯示、不阻擋進入（FR-129 / AS5）——此情境覆蓋由 US4 老師端名單於同步後接住 <!-- 2026-07-27 已實作（離線冷啟動不顯示不阻擋） -->
- [x] T366 [P] [US9] 在 `src/messages/zh-TW.ts`、`en.ts` 新增載入時「已有人登過」提示文案（含兩出路） <!-- 2026-07-27 已實作（已有人登過文案） -->
- [x] T367 [US9] 修正接手者判定：由「登記筆數最多的他人座號」改為「所有登記中最新一筆（`updatedAt` 最晚）的登記者」，含平手處理與「最新一筆是自己則不提示」（FR-126 / FR-126a / FR-128）。判定抽為 `src/lib/takeOver.ts` 的 `detectTakeOver` 純函式並補單元測試 `src/lib/__tests__/takeOver.test.ts` <!-- 2026-08-10 已實作（舊多數決會指向已交棒的舊接手者） -->
- [x] T368 [US9] 提示文案移除登記筆數：改為「這個任務座號 X 已經在登記了，你要接手嗎?」（zh-TW / en 同步）。改判定為「最新一筆」後，任務層級的 N/M 並非該座號一人所登，並列會誤導（FR-126；文案 #14） <!-- 2026-08-10 已實作（連帶移除 detectTakeOver 的 done/total 回傳） -->

**Checkpoint**: 碰撞前攔一次（SC-032）

---

## Phase 11: 文件對齊

- [x] T367 更新 `specs/anomaly-rules.md`：規則一、二狀態由「🟡 待實作」改為已實作；確認規則三定義與實作一致（本文件已為單一真實來源） <!-- 2026-07-27 已實作（anomaly-rules 三規則標已實作） -->
- [x] T368 更新 `specs/data-model.md`：新增 `RecordHandler` entity + ER 圖 + Prisma schema；`Task.dueDate` 寫入慣例改 17:00 <!-- 2026-07-27 已實作（data-model RecordHandler + 17:00） -->
- [x] T369 更新 `specs/ui-spec.md`：新增「三類訊息判準」「失敗態視覺規範」「無法確認狀態」「覆蓋 toast（右上 800ms）」「失敗態 vs 離線態視覺優先序」段落 <!-- 2026-07-27 已實作（ui-spec 失敗態 / 無法確認段落） -->
- [x] T370 更新 `specs/open-questions.md`：「裝置長時間未同步需裝置心跳資料模型」結論標記為**已由 US6 推翻/解決**；預留的 004 名稱更新；「全站網路/同步 policy」「異常條件完整清單」標記由本 feature 承接 <!-- 2026-07-27 已實作（open-questions 心跳標已解決） -->
- [x] T371 在 `specs/002-class-management/spec.md` 記錄差異（AS3 由 004 FR-085 補齊、FR-035 異常條件由 US6 重整；不改原文） <!-- 2026-07-27 已實作（002 spec 前置依賴後加 004 增量差異註記：AS3←FR-085、FR-035←US6） -->
- [x] T372 **擴寫 SC-019**（remediation 回饋）：由「不靜默消失」擴為同時涵蓋「不遺失」與「不分歧」（臉 A 的靜默分歧）；於 `spec.md` Success Criteria 同步文字 <!-- 2026-07-27 已實作（SC-019 擴寫為不遺失 + 不分歧） -->
- [x] T373 刪除 dead string `qr.joinFailedRetry`（與 `join.roomNotFound` 重疊）於 `src/messages/zh-TW.ts`、`en.ts` <!-- 2026-07-27 已實作（qr.joinFailedRetry 已刪） -->
- [x] T374 執行 `spec-align` skill 檢查所有文件一致（含 i18n 對齊） <!-- 2026-07-27 已實作（使用者確認完成） -->

**Checkpoint**: 004 feature 完整收尾

---

## 依賴關係

```
Phase 1 Foundational
  ├─ (a) Overlay 模型 T301–T304a ─────────┐ (真前置)
  ├─ (b) 錯誤碼 T305–T308 ────────────┐   │
  ├─ (c) RecordHandler schema T309–T311   │   │
  └─ (d) 時區工具/純函式 T312–T313 ──┐ │   │
                                       │ │   │
Phase 2 US1（版本戳併入）T314–T320 ◄──┘─┘───┘  (需 Overlay + 錯誤碼 + rev 型別)
Phase 3 US2 T321–T326  ── 可平行（不碰同步層）
Phase 4 US6 T327–T331b ◄── 時區工具/純函式介面
Phase 5 US3（臉 D 併入）T332–T336a ◄── 錯誤碼
Phase 6 US5 T337–T342 ◄── 錯誤碼（區分成因）
Phase 7 US8 T343–T347 ◄── US6（口徑 + detectAnomalies 分流）
Phase 8 US4 T348–T356 ◄── RecordHandler schema
Phase 9 US7 T357–T361 ◄── US6 口徑；同檔 Phase 5 已改 handleMarkComplete
Phase 10 US9 T362–T366 ◄── Overlay（否則資料不穩）
Phase 11 文件對齊 T367–T374 ◄── 全部
```

**關鍵相依**:

- **Overlay（T302/T303）MUST 在 US1（T314）與 US9（T362）之前落地**，且 T304a 手動驗證綠燈才進 Phase 2。否則 US1 會被迫寫繞過競態的 hack、US9 資料判斷不穩（remediation 硬前置）
- **版本戳併入 US1 同一次 reconciliation 改寫（T314）**，避免 `processSyncQueue` 被 churn 兩次
- **臉 D 併入 US3 的 `handleMarkComplete` 重寫（T332）**，同函式一起改
- **錯誤碼（T305–T308）是 US1 conflict 分類與 US3 存檔失敗回饋的功能前提**，須在 Phase 2/5 之前
- **US6（Phase 4）是 US7/US8 的口徑前置**：登記率分子分母排除 `isRemoved` 的算法由 FR-104 定，US7/US8 沿用不另立
- **RecordHandler schema（T309–T311）提前到 Phase 1**（雖 US4 為 P3）：schema 越晚做舊紀錄越補不回門禁資訊，migration 越痛；UI 消費留 Phase 8
- US2（Phase 3）不碰同步層，可與任一 Phase 平行
- A4（GradeRow）、P2-1（生命週期清理）原為 remediation 留待 004 之後的另案，**已於 2026-07-27 提前完成**（見 `offline-sync-remediation.md` §5）；**B4（requestSync 補跑）仍未做**，留待 004 之後。三者皆不在本 tasks 範圍

---

## 給 AI agent 的實作指引

1. **接手時先讀 `spec.md`（why）與 `offline-sync-remediation.md`（同步根因），再讀 `plan.md`（參數），最後 `tasks.md`（where）**
2. **每完成一個 task 將 `[ ]` 改為 `[x]`**，並在 PR 描述引用 task ID
3. **觸碰 offline/sync 的 task，送出前逐條自檢 INV-1 ~ INV-7（plan §2）**；標 `[REM]` 的 task 完成後 MUST 跑對應 RC 手動驗證
4. **每次動工前重讀 remediation 第 6 節交界表核對行號**——Phase 1 一落地，remediation 的行號快照即位移
5. **所有 user-facing 文字走 i18n**（NFR-011/012）；學生端用兒童語氣、指向具體下一步；文案編號對照 spec.md「文案待定稿一覽」
6. **若實作中發現 spec 寫錯**：改 spec、跑 `spec-align`、再改 code，不要反過來
7. **資料安全優先於功能完成**：任何情況下未送出的登記都不得靜默消失（SC-019 / INV-1）——寧可留在佇列標記失敗，不可為了「看起來乾淨」而濾除
