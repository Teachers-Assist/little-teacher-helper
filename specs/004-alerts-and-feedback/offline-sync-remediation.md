# 離線同步／儲存正確性 — Bug 修復計畫 (Offline Sync Remediation)

**建立**：2026-07-26
**狀態**：待實作（規劃定案）
**適用分支**：`feature/abnormal-behavior`（規劃）；實作與 `specs/004-alerts-and-feedback` **交錯進行**（見下方執行順序）

---

## 這份文件是什麼、怎麼用

這是小老師端「離線 ↔ 上線」的同步、重連、本機儲存**正確性** bug 的修復計畫。它記錄的是**根因分析與藥方設計**，不是逐行實作。

**使用方式（重要）**：本計畫**與 004 交錯進行，不是整包延後到 004 之後**。004（Alerts & Feedback）會大幅改寫同一批檔案（`processSyncQueue`、`syncController`、`storage`、登記頁），其中 US1 / US5 / US9 直接觸碰佇列與回填路徑，且**依賴本計畫的仲裁修正為真**（004 spec.md「前置作業」段落已把此依賴寫成硬前置）。因此排序不是「先做完 004 再修 bug」，而是把每個修復項綁在它對應的時機。

### 執行順序（單一真相；004 spec.md「前置作業」段落與此一致）

| 修復項 | 時機 | 理由 |
| --- | --- | --- |
| **Overlay 模型**（臉 B、臉 C-record） | **004 之前**（真前置） | US9 的資料判斷、US1 被 FR-079 放大的「每次開頁必發」競態，都站在這層之上。相對自足（`store.ts` selector + `queueRecordUpdate` 停寫快取），先做一次打好地基 |
| **版本戳 + 條件式套用**（臉 A、臉 C-op） | **併入 US1 同一次改** | 兩者都重寫 `processSyncQueue` 的 reconciliation；一起改避免同一函式被 churn 兩次 |
| **臉 D**（`handleMarkComplete` 回捲） | **併入 US3 同一次改** | US3 FR-088 本來就重寫 `handleMarkComplete`，順手改掉陳舊快照回捲 |
| **A4**（GradeRow 受控化 + debounce） | **004 之後**，另案 | 004 US3 AS6 明文「不改 GradeRow」→ 無 churn 衝突，放後面較乾淨 |
| **B4**（requestSync 補跑旗標） | **004 之後** | 獨立、低 churn、非前置 |
| **P2-1**（records/syncQueue 生命週期） | **004 之後** | 獨立、P2、非前置 |

**每次動工前**：依當下程式碼重新比對本計畫——確認該 bug 是否仍在、行號與函式簽名是否已變、004 是否已順手改掉一部分——更新「現況」欄後再實作。逐項交界見第 6 節。

**為什麼不整包併進 004**：004 的 User Story 是「讓失敗**可見**」（誠實回饋），本計畫是「讓資料在成功路徑上**不分歧、不遺失**」（正確性）。兩者受眾與檢驗標準不同——004 的 SC 全綠時，本計畫的臉 A（靜默分歧）仍可能活著（見 SC-019 的涵蓋缺口，第 6 節）。把整份 bug 修正混進 004 的 US 會讓「回饋做完了」被誤讀為「資料安全了」。**但這不代表延後**：Overlay 是 US1/US9 的地基、版本戳與臉 D 各自綁一個 US，這三者交錯進 004；真正留到 004 之後的只有 A4/B4/P2-1。

---

## 1. 根因：跨 `await` 的陳舊決策

整份離線資料是 localStorage 裡的單一 blob。`queueRecordUpdate`、`processSyncQueue`、`cacheSyncedRecords`、`saveTask` 各自跑 `getOfflineData()` → 改 → `saveOfflineData()`。

**先澄清一個常見誤判**：這**不是**「無序列化的 read-modify-write / 多執行緒競態」。瀏覽器 JS 是單執行緒；每個寫入函式的「讀→改→存」中間沒有 `await`，所以單一 RMW 週期是原子的，`saveOfflineData` 也是重新讀取後才存回，不會整包回捲其他 key。**因此加互斥鎖 / 序列化寫入解不了主要症狀。**

真正的共同根因是：**決策在 `await` 之前算好，套用在 `await` 之後的資料上，中間不做任何版本檢查。** 送出的請求描述的是「過去某個版本」的意圖，回應到達時程式無條件把它套用在「現在」的資料上，而現在的資料可能已經被使用者的新操作改過。

這一個根因有**四張臉**：

| 代號 | 位置 | 症狀 | 觸發條件 |
| --- | --- | --- | --- |
| **臉 A**（原 A1） | `queue.ts` 去重就地換 payload、沿用同一 op id（`addToSyncQueue`）＋ `processSyncQueue` 依 L96 舊快照 ack | 同步飛行期間再次編輯 → 回應 ack 掉「payload 已被換成新值」的 op → 新值從未送出即被移出佇列、標記已同步。**伺服器停在舊值、佇列空、畫面顯示舊值，三方「一致地錯」，新值無聲蒸發** | 單人單裝置，停在頁面上連續編輯（成績逐鍵送出使窗口幾乎必開） |
| **臉 B**（原 B1） | 重連時 `syncController` 的 `requestSync` 與登記頁 `load()` 的 refetch 無排序；`cacheSyncedRecords` 整包覆蓋 `data.records[taskId]` | GET（送出前發出的請求）先回 → 用「還沒收到離線登記的伺服器資料」整包覆蓋 → 離線登記從畫面消失；取消登記被「復活」→ 學生重點一次 → 再送一輪髒資料 | 重連時；**004 FR-079「載入即重試同步」會讓它每次開頁都發生** |
| **臉 C**（新增） | `processSyncQueue` L96 讀一次 `pending`、L123 又讀一次 `data`，reconciliation 用 L96 舊快照判斷 | 兩次讀之間若有 `saveRecord`/`addToSyncQueue`：L126 把 `synced=true` 蓋在可能已是新值的記錄上、L132 用舊 id 移出 payload 已換過的 op、L128 把飛行期間重設為 0 的 `retryCount` 又加回去 | 單人單裝置，送出期間繼續打字。**證明根因不是「refetch 覆蓋」這單一場景** |
| **臉 D**（新增） | `handleMarkComplete`（`helper/[roomId]/[taskId]/page.tsx`）於 `await fetch` 後執行 `saveTask(roomId, { ...task, status })`，`task` 是 await 前的閉包快照 | 送出期間 `load()` 剛把伺服器新 task 寫進快取 → 這行用舊快照整個回捲 task | 標記完成與背景 refetch 撞上 |

**藥方分工**（兩者正交，都要做）：

- **Overlay 模型** → 解「畫面一致性」。臉 B 直接消失；臉 C 的 record 覆蓋消失。
- **版本戳 + 條件式套用** → 解「資料不遺失」。臉 A 得救；臉 C 的 op ack / retry 判斷得救。
- 臉 D 屬同源但獨立小修（見 R1-c）。

---

## 2. 修復項目總表

| 編號 | 內容 | 嚴重性 | 藥方 | 與 R1 關係 |
| --- | --- | --- | --- | --- |
| **R1** | 跨 `await` 的陳舊決策（臉 A/B/C/D） | **P0** | overlay 模型 + op 版本戳 + 條件式套用 | — |
| **B4** | `requestSync` 在 `isSyncing` 期間直接 return，無「結束後補跑」旗標，輪詢已移除 | P1 | pending-rerun 旗標 | 同批修，成因獨立（syncController 重入策略，非資料層） |
| **A4** | `GradeRow` 的本地 `text` 只吃初始值、永不同步 props；且逐鍵 commit + 逐鍵 `requestSync` | P1 | 受控輸入 + debounce/blur commit | 獨立（React 元件層）。004 US3 AS6 明文「不改動 GradeRow」，須另案 |
| **B5** | 逐筆同步狀態（哪幾筆未上傳） | — | **overlay 的免費副產品**，不再獨立列 | 併入 R1 |
| **P2-1** | `records` / `syncQueue` 無生命週期、只增不減 → 逼近 localStorage 配額 | P2 | 清理規則 | 獨立 |

---

## 3. R1 藥方一：Overlay 模型

### 3.1 現況與病灶

畫面直接讀單層快取：`畫面 ← useOfflineRecords(taskId) ← data.records[taskId]`。

`data.records[taskId]` 有**兩個寫入者**且無仲裁：
- 小老師登記：`queueRecordUpdate` → `saveRecord` / `removeRecord`
- 伺服器回填：`cacheSyncedRecords`（整包覆蓋）

同一格資料兩個來源都自稱真相 → refetch 一來就蓋掉未同步的登記（臉 B）。

### 3.2 目標模型：兩層疊加，各一個 owner

```
底層 base    = records 快取 = 伺服器已知狀態的本機鏡像（離線可讀）
覆蓋層 overlay = syncQueue    = 我改了但伺服器還不知道的變更集
畫面顯示的值   = base 疊上 overlay（派生，不儲存）
```

| 層 | 語意 | 唯一寫入者 | 可否整包覆蓋 |
| --- | --- | --- | --- |
| `records` 快取 | 「上次跟伺服器要到的資料長這樣」 | 只有伺服器回填 (`cacheSyncedRecords`) | ✅ 可以，它就是鏡像 |
| `syncQueue` | 「我做了、伺服器還不知道的變更」 | 只有小老師操作 (`addToSyncQueue`) | ❌ 只增只減，不覆蓋 |
| 畫面 | base ⊕ overlay | 無（selector 派生） | — |

### 3.3 疊加規則（`useOfflineRecords` 改為 selector）

對每個學生：
```
若 syncQueue 有此 (taskId, studentId) 的待送 op：
    顯示 op 的值（我剛改的，優先）
    若該 op 為「刪除」→ 顯示成「沒登記」
否則：
    顯示 records 快取的值（伺服器已知的）
```

前提成立性：`addToSyncQueue`（`queue.ts:17`）現有去重保證同一 `(taskId, studentId)` 佇列中最多一筆 op → 疊加無歧義。

### 3.4 這樣為什麼解掉臉 B / 臉 C-record

refetch 整包覆蓋 base 層 → **未同步的值不住在 base，它在 overlay（佇列）裡** → selector 重新疊，值蓋回畫面。refetch 碰不到它。**連「先 sync 再 refetch」的排序都不再必要**——無論誰先誰後，overlay 永遠疊在最上面。這是它勝過「加鎖排序」之處：不是讓兩個寫入者排隊，而是讓他們從此不寫同一層。

### 3.5 附帶收益（一併納入實作）

- **B5 免費**：某列有無待送 op ⟺ 顯示「未同步」標記，無需新欄位。
- `OfflineRecordEntry.synced` 欄位可刪，改由「佇列裡有沒有」派生。
- `queueRecordUpdate` 不再需要寫快取；`removeRecord` 的 delete 分支消失（刪除成為佇列一個 op，overlay 渲染成「沒登記」）。`resolveRecordMutation` 的 upsert/delete 分流從此只影響**送出**，不影響本機顯示。

### 3.6 影響範圍（004 完成後需重新確認行號）

- `src/lib/offline/store.ts`：`useOfflineRecords` 由「回快取」改為「疊加 selector」（讀 `data.records` + `data.syncQueue`）
- `src/lib/offline/queue.ts`：`queueRecordUpdate` 移除 `saveRecord`/`removeRecord` 呼叫（改為只入佇列）
- `src/lib/offline/storage.ts`：`saveRecord`/`removeRecord` 若僅服務登記路徑則可移除；`cacheSyncedRecords` 保留（仍是 base 唯一寫入者）
- `src/types`：`OfflineRecordEntry.synced` 移除（改派生）
- `RecordForm.tsx`：新增未同步逐筆標記（消費 B5）

---

## 4. R1 藥方二：版本戳 + 條件式套用（Optimistic Concurrency）

### 4.1 為什麼 overlay 不夠

Overlay 修好「畫面一致性」：錯誤 ack 後佇列空、畫面顯示 base=舊值，至少螢幕與伺服器一致。**但使用者打的新值仍然丟了。** 要救回新值，需要在 op 上放版本戳。overlay 解一致性，版本戳解不遺失——兩者各對應一個目標。

### 4.2 病灶（臉 A 時間線）

```
t0  改成 v1 → 佇列 op(id=X) → 開始 POST 送 v1
t1  POST 未回，改成 v2 → 去重就地換 payload 成 v2，id 仍為 X
t2  POST 回「id=X 成功」→ 移出 X、標記已同步
        但「成功」講的是 v1，被 ack 掉的 op 現在裝的是 v2 → v2 未送出即蒸發
```

根因：回應描述「過去版本」的成功，程式無條件套用到「現在」的 op。

### 4.3 藥方

**(a) 版本戳**：op 加 `rev`。每次去重就地改 payload 時 `rev++`。
```
addToSyncQueue 改既有 op 的 payload 時： op.rev += 1（新建 op 時 rev = 0）
```

**(b) 記下送出的版本**：`processSyncQueue` 送出前，記住每個 op 送出當下的 `rev`（本地 `sentRev` 對照表，key = op.id）。

**(c) 條件式套用**：回應到達時，只有「op 現在的 rev === 送出時的 sentRev」才 ack。
```
回應「id=X 成功」：
  若 queue 中 op(X).rev === sentRev[X]：
      安全移出佇列、（base 由後續 refetch 或本次回填更新）
  否則（rev 變大＝飛行期間被改）：
      不移出、不標記 → 保留在佇列，下一輪送出最新 payload
```

套回時間線：t2 檢查 `op.rev(2) ≠ sentRev(1)` → 不 ack → op 留下，下輪送 v2。**v2 得救。**

### 4.4 這是「樂觀並行控制」而非鎖

不阻止飛行期間繼續編輯（樂觀假設通常無衝突），只在**套用結果時驗版本**，發現被動過就放棄套用、重來。對比悲觀鎖（送出期間禁止編輯，體驗差）。

**為何鎖無效**：臉 A 中 `processSyncQueue` 即使獨占鎖、無人搶寫，它手上「X 成功」的判斷**本身就過期**。鎖保證不了判斷的新鮮度，只有「套用前比對版本」能。

### 4.5 臉 C 的 op 部分一併解掉

reconciliation 改為「條件式」後，L128 的 `retryCount` 累加、L132 的移出，都改成先比對 `rev`（及「這筆是否為本輪送出的」），不再用 L96 舊快照盲套。實作時 `processSyncQueue` 的兩次讀取合併為「送出前記 sentRev 快照 → 送出 → 回應後以當前 `getOfflineData()` + sentRev 比對套用」。

### 4.6 影響範圍

- `src/types`：`OfflineSyncQueueItem` 新增 `rev`
- `src/lib/offline/queue.ts`：`addToSyncQueue` 去重時 `rev++`；`processSyncQueue` 送出前記 `sentRev`、回應後條件式套用
- `/api/sync`（`src/app/api/sync/route.ts`）：**無需改動**——`rev` 是純 client 端的樂觀控制，伺服器仍照 operationId ack；client 自行決定是否採信

### 4.7 臉 D（handleMarkComplete 回捲）

獨立小修（R1-c）：`handleMarkComplete` 於 `await` 後不要用閉包舊 `task` 拼 `saveTask`；改為以回應內容、或以最新 `getTasks()`/store 值為基礎更新 status。與版本戳同精神（不套用陳舊快照），但範圍小、可單獨改。

---

## 5. 其他項目

### B4 — requestSync 補跑旗標（P1）

現況：`requestSync` 在 `runtime.isSyncing` 時直接 return（`syncController.ts`），輪詢已移除，故同步飛行期間新增的 op 要等下次 `online`/`visibilitychange` 才送；若學生停在頁面上登記完直接關閉，可能不送出。

藥方：加 `pendingRerun` 旗標——同步進行中若再收到 `requestSync`，設旗標；當前同步結束後檢查旗標，若有則自動再跑一次。屬 syncController 重入策略，與資料模型無關，可與 R1 同批但獨立驗證。

### A4 — GradeRow 受控化與 debounce（P1）

現況：`GradeRow` 的 `text = useState(value 初始值)`，之後不隨 props `value` 更新（`key={student.id}` 保證不重掛）→ 伺服器回填在成績類任務顯示不出來，且 B 一輸入就蓋 A；`onChange` 每個字元 commit + `requestSync` → 放大臉 A 的觸發面。

藥方：
1. focus 中不被 props 覆蓋、blur/idle 時以 props 對齊（受控 + 本地編輯緩衝）
2. commit 改 debounce 或 blur 才送，取消逐鍵送出

注意：**004 US3 AS6 明文「GradeRow 此處已符合設計，本 US 不改動」** → 本項不在 004 範圍，必須另案。004 完成後確認此段仍未被動到。

### P2-1 — records / syncQueue 生命週期（P2）

現況：`records` 只增不減；`clearRoom` 刻意保留 records/syncQueue（換座號不丟未同步資料，此決策正確且須維持）。但**換班級、任務被刪、學生被移除後**這些資料永遠留著且仍會上傳 → 長期逼近 localStorage 配額 → 觸發本機儲存失敗（004 FR-089/090 只告知、不根治成因）。

藥方（待細部設計）：定義清理規則，例如「已同步且 base 對應的 task 已不存在／學生已移除且無待送 op」的整包移除；保留「有待送 op」者不動（守資料安全底線）。與 004 的清理無衝突，屬新增。

---

## 6. 與 004 的交界（每項綁定的時機與核對點）

下表對照「每個修復項綁哪個 US、動工前要核對什麼」。時機以第 0 節「執行順序」表為準；此處補充各項與 004 的具體交界。

| 交界項 | 綁定時機 | 動工前核對 |
| --- | --- | --- |
| **臉 B 與 FR-079** | Overlay：**004 之前** | FR-079 要求「載入時重置重試判定並觸發一次同步」，與登記頁 `load()` 的 refetch 同時機 → 使臉 B 從「重連偶發」變「每次開頁必發」。**因此 Overlay 必須先落地，US1 才建在正確地基上**；否則 US1 會被迫寫繞過臉 B 的臨時 hack，修根因時再拆掉 |
| **版本戳 vs US1 的 processSyncQueue 重寫** | 版本戳：**併入 US1** | US1（FR-077/078/079）重寫 reconciliation（解析 conflicts、重試分類、retryCount 重置），版本戳的條件式套用（4.3c）也改同一段。**同一次改完成**，避免雙 churn。實作時把「conflict 分類」與「rev 比對 ack」寫在同一輪收尾 |
| **臉 D vs US3 的 handleMarkComplete 重寫** | 臉 D：**併入 US3** | US3 FR-088 重寫 `handleMarkComplete`（加失敗回饋、按鈕復位），臉 D 的「不用閉包舊 `task` 拼 `saveTask`」在同一函式。一起改 |
| **US9（FR-126）依賴 overlay** | Overlay：**004 之前** | US9 用 `/api/records` 判斷「有無非本人座號登過」。Overlay 未落地時，本機未同步登記被覆蓋後才取得資料 → 更易誤觸「已有人登過」；接手後若 A4 未修，成績欄顯示不出前人分數 → 整份重登（正是 US9 想避免的）。確認 004 的 US9 實作假設 overlay 已存在 |
| **錯誤碼（FR-111~113）** | 版本戳併入 US1 時一併沿用 | 條件式套用（4.3c）判斷「可否 ack / 可否重試」時，沿用 004 定案的 `ERROR_CODES`，不自建文字比對 |
| **A4 與 US3 AS6 的排除** | A4：**004 之後** | US3 AS6 明文「不改 GradeRow」→ 004 完成後確認該段仍未被動到，再另案受控化 + debounce |
| **檔案重疊清單** | 每次動工前重讀 | `processSyncQueue`、`syncController.ts`、`storage.ts`（`cacheSyncedRecords`）、`store.ts`（`useOfflineRecords`）、登記頁 `handleMarkComplete`/`load`、`OfflineSyncQueueItem`/`OfflineRecordEntry` 型別 |

**對 004 的兩點回饋（非本計畫工作項，需在 004 內處理）**：

- **SC-019 的涵蓋缺口**：SC-019 只保證「登記不會**靜默消失**」，涵蓋不到臉 A 的「伺服器與本機**靜默分歧**」（佇列正常清空、指示器顯示已同步、內容卻是舊的）。建議在 004 收尾時把 SC-019 擴寫為同時涵蓋「不遺失」與「不分歧」，否則 004 測試全綠時臉 A 仍活著。
- **US4 離線覆蓋的可見性缺口**：FR-096 要求「覆蓋他人紀錄時 toast 告知」，但離線時本機無他人記錄 → 系統不知這是覆蓋 → toast 不出現；FR-097 只保證處理紀錄併入名單，無「同步後才發現覆蓋 → 補告知」路徑。建議 004 補一句（承認「離線覆蓋僅老師端可見」或定義同步後補告知）。本計畫的 overlay 不解此項（回饋層，非資料層）。

---

## 7. 驗證準則（實作後）

- **RC-1（臉 A / 不遺失）**：成績類任務，同步飛行中連續改 v1→v2；mock `/api/sync` 慢回 v1 成功 → 佇列 MUST 仍保有 v2 並於下輪送出；伺服器最終值 MUST 為 v2；指示器 MUST NOT 在 v2 未送出時顯示「已同步」。
- **RC-2（臉 B / 一致性）**：離線登記數筆 → 觸發 refetch（`cacheSyncedRecords` 整包覆蓋 base）→ 畫面 MUST 仍顯示離線登記值；取消登記 MUST NOT 被「復活」。
- **RC-3（臉 C / 單裝置）**：送出期間持續 `saveRecord`/`addToSyncQueue` → reconciliation MUST NOT 把新值標為已同步、MUST NOT 把重設的 retryCount 加回。
- **RC-4（臉 D）**：`handleMarkComplete` 送出期間 `load()` 寫入新 task → 完成後 task MUST NOT 被舊快照回捲。
- **RC-5（B4）**：同步飛行中新增 op → 當前同步結束後 MUST 自動再跑一次並送出該 op（無需 online/visibility 事件）。
- **RC-6（A4）**：成績類任務，伺服器回填新值 → 未 focus 的欄位 MUST 顯示新值；focus 編輯中 MUST NOT 被覆蓋；commit MUST NOT 逐字元送出。
- **RC-7（B5）**：有待送 op 的列 MUST 有可辨識的未同步標記；同步成功後標記消失。
- **RC-8（P2-1）**：切換班級 / 任務被刪後，對應的已同步 records MUST 可被清理；有待送 op 者 MUST 保留。

---

## 沿革

| 日期 | 變更 |
| --- | --- |
| 2026-07-26 | 建立。根因定為「跨 await 的陳舊決策」（四張臉 A/B/C/D），非「無序列化 RMW」；藥方定為 overlay 模型（解一致性）＋ 版本戳/條件式套用（解不遺失）；B4/A4/P2-1 各自獨立；標注延後至 004 之後實作並列出交界核對清單 |
| 2026-07-26 | 排序定調修正：由「整包延後到 004 之後」改為**與 004 交錯**——Overlay 前置於 004、版本戳併入 US1、臉 D 併入 US3、A4/B4/P2-1 留 004 之後。與 004 spec.md「前置作業」段落對齊；第 6 節交界表改為「每項綁定時機」 |
