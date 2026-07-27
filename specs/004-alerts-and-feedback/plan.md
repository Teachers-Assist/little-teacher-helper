# Plan: 004 警示、證據與回饋機制 (Alerts & Feedback)

**Input**: `specs/004-alerts-and-feedback/spec.md`、`tasks.md`
**前置依賴**: 001 / 002 / 003 已實作完成；本 feature 在其上補齊與修正，不取代原 spec
**關聯計畫**: `specs/offline-sync-remediation.md`（同步／儲存正確性 bug 修復）—— **與本 feature 交錯進行，非整包前置或整包延後**
**狀態**: 規劃定案，待實作

本檔記錄 spec 指定「寫入 plan.md 前需收斂」的具體實作參數與技術決策，並定義本 feature 與 remediation 計畫**交錯執行的單一真相順序**，以及每個觸碰同步／儲存路徑的 task 都必須遵守的正確性守則。

> **接手順序**：先讀 `spec.md`（why）與 `specs/offline-sync-remediation.md`（同步根因與藥方），再讀本檔（具體參數），最後照 `tasks.md`（where）實作。

---

## 1. 與 remediation 的整合關係（最關鍵，先讀）

本 feature 會大幅改寫小老師端的同步／回填／登記頁程式碼，其中 **US1 / US5 / US9 直接觸碰佇列與回填路徑，且依賴 remediation 的仲裁修正為真**（spec.md「前置依賴」段落已寫成硬前置）。因此排序不是「先做完 004 再修 bug」，而是把每個修復項綁在對應的時機。

### 執行順序（單一真相；與 `offline-sync-remediation.md` 第 0 節「執行順序」表 MUST 完全一致）

| remediation 修復項 | 相對本 feature 的時機 | 落在本 plan 的 Phase | 為何是這個時機 |
| --- | --- | --- | --- |
| **Overlay 模型**（臉 B、臉 C-record） | **US1 / US9 之前**（真前置） | Phase 1（T301~T304） | US9 的資料判斷、US1 被 FR-079 放大成「每次開頁必發」的覆蓋競態，都站在「佇列↔回填↔畫面」仲裁正確之上。地基不先正確，US1 會被迫寫繞過競態的臨時 hack、US9 判斷「有無他人登過」的資料不穩 |
| **版本戳 + 條件式套用**（臉 A、臉 C-op） | **併入 US1 同一次改** | Phase 3（T314） | US1（FR-077~079）本就重寫 `processSyncQueue` 的 conflict 解析與 reconciliation；版本戳改動同一段收尾。一起改，避免同一函式被 churn 兩次 |
| **臉 D**（`handleMarkComplete` 陳舊快照回捲） | **併入 US3 同一次改** | Phase 6（T332） | US3 FR-088 本就重寫 `handleMarkComplete`（加失敗回饋、按鈕復位）；臉 D 在同一函式，順手改掉「用 await 前的閉包 `task` 拼 `saveTask`」 |
| **A4**（GradeRow 受控化 + debounce） | ✅ 已完成 2026-07-27（提前） | 不在本 plan | 原排「004 之後」；AS6 改寫為只保護數字驗證後無 churn 衝突，提前修 |
| **P2-1**（records/syncQueue 生命週期清理） | ✅ 已完成 2026-07-27（提前） | 不在本 plan | 原排「004 之後」；獨立、與 004 清理無衝突，提前修 |
| **B4**（requestSync 補跑旗標） | **本 feature 之後**，另案（未做） | 不在本 plan | 非 US1/US9 前置，獨立低 churn |

**一句話**：Overlay 先於 US1/US9（Phase 1）；版本戳併入 US1（Phase 3）；臉 D 併入 US3（Phase 6）；A4/P2-1 已提前完成（2026-07-27）；B4 仍留待本 feature 之後。

### 交錯執行的兩條鐵則

1. **US1 / US9 的自動化驗收（SC-032、US1 AS7）MUST 在 Overlay 落地後才視為有效。** 在 Overlay 之前跑，可能因底層競態偽陽／偽陰，不代表 spec 行為錯誤。
2. **每次動工前，依當下程式碼重新比對 remediation 計畫** —— 確認該 bug 是否仍在、行號與函式簽名是否已被前面的 Phase 改過。remediation 的行號是撰寫當下（2026-07-26）的快照，Phase 1 一落地就會位移。

---

## 2. 同步與儲存正確性守則（觸碰 offline/sync 的 task MUST 全程遵守）

> 這一節直接回應「確保程式碼撰寫時不會產生更多的問題」。任何改到 `src/lib/offline/*`、登記頁 `load()`/`persist()`/`handleMarkComplete`、或同步 API 的 task，**送出前必須逐條自檢**。

- **INV-1 未送出資料一律持久化（NFR-013 / SC-019）**：佇列項目（未上傳的登記）MUST 持久化於 localStorage，**任何路徑都不得靜默從佇列移除**。重試耗盡、不可重試、reconciliation —— 全部只能「標記狀態」，不能「刪掉資料」。
- **INV-2 重試判定不持久化、每次載入重置**：`retryCount` 與「不可重試」標記為 session 範圍，MUST NOT 寫入 localStorage，MUST 於每次頁面載入時重置並觸發一次重試（US1 AS7 / FR-079）。這與 INV-1 正交：**重置的是判定，保留的是資料**。
- **INV-3 兩層各一個 owner（Overlay 模型）**：`records` 快取＝伺服器鏡像，**唯一寫入者是 `cacheSyncedRecords`**；`syncQueue`＝未同步變更集，**唯一寫入者是小老師操作**。畫面＝base ⊕ overlay 的**派生值，不另存**。實作後 `queueRecordUpdate` **不得再寫 records 快取**。
- **INV-4 不套用陳舊決策**：跨 `await` 的回應 MUST 先驗版本（op.rev === sentRev）再 ack；`handleMarkComplete` 等 MUST NOT 用 await 前的閉包快照拼寫回存。這是 remediation 四張臉的共同根因，違反即製造靜默分歧。
- **INV-5 不謊報同步狀態**：指示器顯示「已同步」的充要條件是「佇列中該筆已無待送 op」。MUST NOT 在 payload 已被換新、卻 ack 舊 op 的情況下顯示已同步（臉 A）。
- **INV-6 計算層排除 isRemoved、不刪 records**：所有登記率／登滿判定，分母只計 `isRemoved=false` 學生、分子排除移除學生的紀錄；**records 實體一律保留**（守 002 FR-025/026 與 vision 原則一可逆）。全站沿用同一組口徑（FR-104 / FR-119 / FR-120），不得另立第二套。
- **INV-7 純函式邊界**：`detectAnomalies` MUST 維持純函式（無 I/O），monitoring 與 dashboard 兩 endpoint 共用；DB 過濾（排除 isRemoved、納入 HELPER_COMPLETED）由 endpoint 負責，不下放進純函式。

**驗證對照**：本守則對應 remediation 第 7 節 RC-1 ~ RC-8。實作 Overlay / 版本戳 / 臉 D 後，MUST 跑對應 RC 手動驗證（見 tasks Phase 對應「同步正確性驗證」項）。

---

## 3. 技術決策與參數（spec 交由 plan 收斂者）

### 3.1 同步地基（remediation 藥方，摘要；完整根因與藥方見 `offline-sync-remediation.md` §3/§4）

- **Overlay 模型**：`useOfflineRecords`（`src/lib/offline/store.ts`）由「回快取」改為「疊加 selector」——讀 `data.records`（base）＋ `data.syncQueue`（overlay），對每個 `(taskId, studentId)`：佇列有待送 op 就顯示 op 值（刪除 op 顯示成「沒登記」），否則顯示 base。`queueRecordUpdate`（`queue.ts`）移除 `saveRecord`/`removeRecord` 呼叫（只入佇列）。`OfflineRecordEntry.synced` 欄位移除，改由「佇列裡有沒有」派生（remediation B5 免費副產品：逐筆未同步標記）。
- **版本戳**：`OfflineSyncQueueItem` 新增 `rev`（新建 op = 0；`addToSyncQueue` 去重就地換 payload 時 `rev++`）。`processSyncQueue` 送出前記 `sentRev` 對照表；回應到達時，只有 `op.rev === sentRev[op.id]` 才 ack、移出佇列，否則保留待下輪送最新 payload。`/api/sync` **無需改動**（`rev` 為純 client 樂觀並行控制，伺服器仍照 operationId ack）。

### 3.2 重試策略（FR-080，收斂為調參）

因 FR-079「每次頁面載入重置並重試一次」，session 內「放棄」不再等於資料死亡，只是延到下次載入。故重試機制的角色是「避免 session 內狂打伺服器」，非「決定資料生死」。定案：

- 沿用既有 `MAX_RETRY_COUNT = 3` 作為 **session 內**上限；達上限的可重試項標記為「暫緩（needs-attention）」而**非移除**（INV-1）。
- 退避：可重試項在 `online` / `visibilitychange` 事件時重試即可，不另建計時輪詢（輪詢已於先前移除，勿加回）。
- 不可重試項（TASK_LOCKED / TASK_NOT_FOUND / VALIDATION_FAILED）**立即停止重試**、直接進入失敗態告知流程，不累加 retryCount。
- 上述皆為調參，日後可調整曲線，**不影響資料安全**（資料由 INV-1/INV-2 保障）。

### 3.3 API 錯誤碼（FR-111 ~ FR-113）

`src/i18n/errorCodes.ts` 現有 `ERROR_CODES`（已涵蓋加入班級、學生 CRUD）。本 feature 新增：

| 新增碼（建議名） | message 路徑（兒童語氣，學生端可見者） | 用途 / 分類 |
| --- | --- | --- |
| `TASK_LOCKED` | `sync.taskLocked`（例：「這個任務老師已經收起來了」） | US1 **不可重試** |
| `TASK_NOT_FOUND` | `sync.taskNotFound` | US1 **不可重試** |
| `RECORD_VALIDATION_FAILED` | `record.saveFailed`（沿用既有 dead string） | US1 **不可重試**（資料問題重送也不會過） |
| `STUDENT_NOT_IN_ROOM` | `sync.studentRemoved` | US1 **不可重試**（老師已移除學生） |

- `/api/sync` 的 `conflicts[].reason`、`/api/records` 的 `errors[].reason` 與各 400/404/500 的 `error` 欄位 MUST 改回傳上列碼值，**不得回硬編中文字串**。
- Client 分類（FR-078）依碼值判斷可重試／不可重試，**MUST NOT 用中文文字比對**。
- 純內部 500 沿用 catch-all `INTERNAL_ERROR: 'common.error'`，不需個別文案（FR-113）。
- 學生端統一透過既有 `resolveError()`（`src/i18n/resolveError.ts`）翻譯；未在字典中者落回 catch-all。

### 3.4 時區處理（NFR-016，規則二／截止時間的關鍵）

執行環境為 Cloudflare Workers（UTC），故絕對時鐘 MUST 明確綁 `Asia/Taipei`：

- 台灣**無日光節約時間**，固定 `+08:00` 偏移即可，MUST NOT 依賴伺服器本地時區或 `Date` 的本地方法。
- 新增小工具（建議 `src/lib/timezone.ts`）：`taipeiDayStartAt(date, hour)` 回傳「該日期在台北時區的 hour:00」對應的 UTC `Date`。規則二用 `hour=8`、截止時間寫入用 `hour=17`。
- `detectAnomalies` 為純函式：把「截止日當天 08:00（UTC 時刻）」由 endpoint 算好傳入，或傳入 `now` 與已正規化的 `dueDate` 由純函式比較——**時間換算不放進純函式內**（守 INV-7）。

### 3.5 截止時間 17:00（FR-108 / FR-109）

- `TaskForm.tsx` 硬編的 `T23:59:59` 改為透過 3.4 的工具寫成台北 17:00。**延長截止**設定的新日期同樣正規化為 17:00（Edge Case 決議）。
- 既有 `dueDate=23:59:59` 的舊任務 **MUST NOT migration**，接受一段期間新舊不一致（FR-109）。
- 此為**實質行為變更**：`getTaskLockReason` 令新任務於 17:00 鎖定（學生可登記時間由半夜縮短至放學）。

### 3.6 RecordHandler 子表（US4；schema 變更，唯一需要動 DB 的 US）

- Prisma 專案**無 migrations 目錄，使用 `prisma db push`**（sqlite `dev.db`；沿用 002 決策）。**不寫 migration 檔**。
- 新增子表 `RecordHandler`：`recordId`（FK→Record）、`seatNumber`、`handledAt`；`Record` 1:N `RecordHandler`，順序由 `handledAt` 決定。
- **避免重複造欄位**：`recorderSeatNumber`＝名單最後一筆座號；`updatedAt`＝名單最後一筆時間；名單第一筆＝最初建立者。`isAssignedRecorder` 語意**維持現狀**（跟隨最後一手），US6 只移除它在異常偵測的用途，**不刪欄位**。
- **連續同座號去重（FR-093）**：寫入時若名單最後一筆的座號 === 本次座號，MUST NOT 追加相鄰重複項；被他人穿插後的同座號再次修改仍各自記錄。
- **既有紀錄回填（NFR-014）**：無歷史名單者，以「僅含現有 `recorderSeatNumber`、時間為 `createdAt` 的最小名單」回填，UI 呈現「無更多歷史」；migration（db push）MUST NOT 失敗。
- **離線經手鏈（FR-097）**：離線期間的（座號, 時間）隨同步送出並依 `handledAt` 正確併入名單。

### 3.7 UI 視覺與呈現（寫入 `ui-spec.md`）

- **同步失敗態（FR-081）**：`SyncIndicator` 新增第三態，與「同步中」「待上傳」視覺可區分，顯示受影響筆數；文案指向「去找老師」（沿用 003 FR-065 升級模式）。
- **無法確認狀態（FR-083/084/086）**：老師端 monitoring 失敗時呈現「無法確認」（非「一切正常」空狀態）＋重試；區分「連線問題」與「伺服器錯誤」兩句文案。dashboard 異常數在無法取得時顯示 **`—`**，MUST NOT 顯示 0 或過期值。
- **覆蓋陳述句 toast（FR-096）**：沿用既有 Toast 元件（002 T146 已建）；右上角、**800ms 自動消失**、非警告色、不阻擋、不需手動關閉。
- **失敗態 vs 離線態的視覺優先序（Edge Case）**：避免兩個 banner 相疊（參照 003 FR-070 已遇過的色塊相疊問題）—— 定義單一優先呈現，於 ui-spec 記錄。

### 3.8 detectAnomalies 介面變更（US6 / US8）

- **新增輸入**：班級學生總數（只計 `isRemoved=false`）、最後一次登記活動時間。
- **移除輸入**：`assignedRecorderHasRecord`；`monitoring/route.ts` 對應的 `distinct` 查詢一併移除（FR-105）。
- **status 分流**：規則一、二維持 ACTIVE-only；規則三獨立判 `HELPER_COMPLETED`（打破現行 `status !== 'ACTIVE'` 的 early-return）。monitoring 與 dashboard 兩 endpoint MUST 把 `HELPER_COMPLETED` 任務納入查詢範圍（FR-122）。
- **實作注意**：monitoring route 現用 `task._count.records`（含移除學生的原始筆數）當 `recordedCount`；FR-104 要求分子排除移除學生 → 改為過濾後計數（`_count` 加 `where: { student: { isRemoved: false } }`），dashboard 同理。

---

## 4. Phase 總覽與相依（詳見 tasks.md）

優先序依**傷害嚴重度**（資料遺失 > 信任破壞 > 體驗），但實作順序另受相依約束：Overlay 與錯誤碼是 US1 前置、US6 是 US7/US8 的口徑前置、RecordHandler schema 是 US4 前置。

| Phase | 內容 | 優先 | 關鍵相依 |
| --- | --- | --- | --- |
| 1 | Foundational：**Overlay 模型（remediation 前置）**、錯誤碼統一、RecordHandler schema、detectAnomalies 純函式介面骨架、時區工具 | — | 無（本身是地基） |
| 2 | US1 同步失敗出口 **＋ 版本戳併入** | P1 | Phase 1（Overlay + 錯誤碼 + 版本戳型別） |
| 3 | US2 老師端誠實呈現 | P1 | 可平行（不碰同步層） |
| 4 | US6 異常規則重整 | P1 | Phase 1（純函式介面 + 時區工具） |
| 5 | US3 學生端存檔回饋 **＋ 臉 D 併入** | P2 | Phase 1（錯誤碼） |
| 6 | US5 生命週期語意 | P2 | Phase 1（錯誤碼，區分 404/網路/無資料） |
| 7 | US8 完成但登記率過低（規則三） | P2 | Phase 4（US6 口徑 + detectAnomalies 分流） |
| 8 | US4 監視器留痕與查閱 | P3 | Phase 1（RecordHandler schema） |
| 9 | US7 標記完成前承諾核對 | P3 | Phase 4（US6 口徑）；同檔於 Phase 5 已改 `handleMarkComplete` |
| 10 | US9 載入時「已有人登過」提示 | P3 | Phase 1（Overlay，否則資料不穩） |
| 11 | 文件對齊（spec-align） | — | 全部 |

---

## 5. Complexity / 風險追蹤

| 風險 | 影響 | 緩解 |
| --- | --- | --- |
| Overlay 是大範圍改動且為多個 US 地基 | 若做壞，US1/US9 全部建在流沙上 | 先獨立落地 Overlay 並跑 RC-2/RC-3 手動驗證，綠了才進 US1；US1/US9 驗收在 Overlay 之後 |
| 同一批檔案被 004 與 remediation 交錯改 | 行號位移、重複 churn | 版本戳併入 US1、臉 D 併入 US3（同函式一次改）；每次動工前重讀 remediation 第 6 節交界表核對 |
| `HELPER_COMPLETED` early-return 調整 | 動到共用純函式，可能影響規則一、二 | 規則三獨立分支，規則一、二維持 ACTIVE-only；兩 endpoint 查詢範圍一起調整，避免只改一處 |
| 時區在 CF Workers（UTC）誤用本地時間 | 規則二／鎖定時點錯誤 | 集中於 `timezone.ts` 工具、固定 +08:00、純函式不做換算（INV-7） |
| schema 改動越晚做，舊紀錄越補不回門禁資訊 | migration 越痛 | RecordHandler 放 Phase 1（雖 US4 為 P3），提前落地 schema；UI 消費留在 Phase 8 |

---

## 6. 文件影響（收尾以 `spec-align` skill 確認全部套用）

以 spec.md「文件影響」表為準，重點：`anomaly-rules.md`（規則三已補、規則一二狀態標 004 定案）、`data-model.md`（RecordHandler + `Task.dueDate` 17:00 慣例）、`ui-spec.md`（三類訊息判準／失敗態／無法確認狀態／覆蓋 toast 規範）、`open-questions.md`（裝置心跳結論推翻標為已解決）、`002/spec.md`（AS3 由 FR-085 補齊，記錄差異不改原文）、`002/plan.md`（閾值表已指向 anomaly-rules.md）。

**remediation 對 004 的兩點回饋（需在本 feature 收尾處理，非 remediation 工作項）**：

1. **SC-019 涵蓋缺口**：SC-019 只保證「不靜默消失」，涵蓋不到臉 A 的「靜默分歧」（佇列清空、指示器顯示已同步、內容卻是舊的）。收尾時將 SC-019 擴寫為同時涵蓋「不遺失」與「不分歧」——否則 004 測試全綠時臉 A 仍可能活著。已由本 plan INV-5 於實作層補上，spec SC 文字需同步。
2. **US4 離線覆蓋可見性缺口**：spec 已於 Edge Cases「離線覆蓋的可見性只到老師端」與 FR-096 註明（離線無他人記錄快取時 toast 不觸發，改由老師端 RecordHandler 名單於同步後承接，且刻意不做同步後補告知）。確認實作與此一致即可，無需新增路徑。
