# Feature Specification: 班級管理體驗強化 (Class Management UX)

**Feature Branch**: `002-class-management`
**Created**: 2026-06-25
**Status**: Draft
**Input**: walk-through 老師端介面後識別的調整集合 —— 學生 / 任務管理一致化、Excel 批次匯入、軟刪除與還原、報表 dashboard 化、StudentList 元件拆分。

**前置依賴**: `specs/001-little-teacher-helper/` 已實作完成。本 feature 在其上做擴充與修正，不取代原 spec。

**對應原則**（簡述，完整內容見 `specs/vision.md`）:
- 老師做最少操作 → Excel 匯入、批次管理
- 可逆性決定保護強度 → 所有刪除採 soft delete + 還原
- 老師是被通知後的決策者 → 報表 tab 重定位為「班級狀況 tab」，預設顯示需要注意的事
- 鷹架不是黑盒 → Excel 匯入錯誤訊息要指出具體位置

**路由地圖（本 feature 定稿後）**:
```
/teacher/rooms/[id]
  ├─ 班級資訊區塊（跨 tab 共用，置於 tab 列之上）
  ├─ 班級狀況 tab    ：警告區 + 簡易統計（取代原本「報表 tab」概念）
  │                  ← tab 列**第一個**、且為**預設首見視角**（老師先看需要注意的事）
  ├─ 學生 tab    ：列表 + 表單（新增/編輯/移除入口）
  └─ 任務 tab    ：列表 + 表單新增（inline，與學生 tab 互動模式一致）
                 + 列項 icon：編輯（將該任務載入表單）+ 封存
                 + 點任務列項（卡片上半部）→ 跳 /teacher/tasks/[roomId]/[taskId]
  ※ 學生/任務 tab 版面：列表欄（較小、左／手機在上）+ 表單欄（較大、右／手機在下）；
    點編輯時自動捲動至表單欄（見 UI 反饋 2026-06-26）

/teacher/tasks/[roomId]            ← 廢除（功能完全被任務 tab 取代）
/teacher/tasks/[roomId]/[taskId]   ← 單一任務細節頁
                                     入口：任務 tab 點任務列項、班級狀況 tab 點警告
                                     職責：該任務完整登記結果、匯出
                                     不在此頁做設定編輯（編輯回任務 tab，靠側欄導航返回）
```

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 老師批次匯入學生名單 (Priority: P1)

老師在建立班級時或建立後，可以下載 Excel 範本檔，填好後上傳，系統一次匯入所有學生。匯入時若有衝突（同座號、同姓名重複、或檔案內部重複），系統拒絕匯入並列出每一筆衝突所在的列號與內容，老師修正 Excel 後再上傳。

**Why this priority**: 30-40 人的班級若一個一個手動加，老師會放棄使用系統。這條直接決定主流老師的第一印象。

**Independent Test**: 下載範本 → 填 10 筆學生 → 上傳成功 → 故意製造衝突 → 看到清楚錯誤訊息。

**Acceptance Scenarios**:

1. **Given** 老師在 `/teacher/rooms/new` 或 `/teacher/rooms/[id]` 學生 tab, **When** 老師點擊「下載 Excel 範本」, **Then** 系統提供 `students-template.xlsx`，包含「座號」「姓名」兩欄與一列範例資料
2. **Given** 老師填好範本, **When** 老師點擊「上傳 Excel」並選擇檔案, **Then** 系統解析檔案並進行驗證
3. **Given** 上傳的 Excel 無衝突, **When** 系統驗證通過, **Then** 所有學生一次新增成功，畫面顯示「成功匯入 N 位學生」
4. **Given** 上傳的 Excel 有衝突（檔案內重複、與既有學生衝突、欄位格式錯誤）, **When** 系統驗證失敗, **Then** **整批拒絕匯入**，畫面列出每一筆衝突的列號、欄位、衝突原因
5. **Given** 上傳的檔案格式錯誤（非 .xlsx、欄位缺漏、檔案損毀）, **When** 系統解析失敗, **Then** 顯示具體錯誤（例：「找不到『座號』欄位」），而非「匯入失敗」

---

### User Story 2 - 老師管理學生（編輯與軟刪除） (Priority: P1)

老師在學生 tab 看到每位學生的列項都有「編輯」與「移除」icon。**編輯採與任務 tab 一致的介面/行為**：點編輯 icon 將該學生資料載入側欄的「新增/編輯學生」表單（表單切換為編輯模式），儲存後表單回到新增模式。移除後該學生不再出現在主畫面，但歷史登記記錄保留；老師可在「已移除學生」入口看到所有被移除的學生並一鍵還原。

**Why this priority**: 學生轉學、姓名打錯、座號重排是真實場景；目前介面只能新增不能改 / 刪，老師會卡住。

**互動一致性**: 學生編輯與任務編輯（US3）共用同一套互動樣式 —— inline 側欄表單、模式切換（新增 ↔ 編輯）、編輯時顯示「正在編輯：[姓名 / 任務名]」+「取消編輯」按鈕。**不使用 modal**。

**Independent Test**: 編輯學生姓名 → 側欄表單載入該學生資料 → 改完儲存 → 表單回新增模式；移除學生 → 主清單看不到 → 進「已移除」看得到 → 還原 → 回到主清單。

**Acceptance Scenarios**:

1. **Given** 老師在學生 tab, **When** 老師檢視學生列表, **Then** 每一列右側顯示「編輯」與「移除」icon
2. **Given** 老師點任意學生列項的「編輯」icon, **When** 系統載入該學生到側欄表單, **Then** 表單顯示「編輯學生」模式（顯示「正在編輯：[姓名]」、附「取消編輯」按鈕），與任務 tab 的編輯互動完全一致
3. **Given** 老師在編輯模式儲存, **When** 系統更新成功, **Then** 表單清空回到「新增」模式
4. **Given** 老師點擊「移除」icon, **When** 系統顯示確認對話框（一層，因可還原）, **Then** 老師確認後該學生 `isRemoved = true`，主清單立即消失
5. **Given** 老師在學生 tab, **When** 老師點擊「已移除學生」入口, **Then** 系統顯示所有 `isRemoved = true` 的學生，每筆可一鍵還原
6. **Given** 學生已被移除, **When** 老師查看舊任務的報表 / 細節頁, **Then** 該學生的歷史記錄仍存在，但姓名後標註「（已移除）」

---

### User Story 3 - 老師在任務 tab 內完成所有任務管理 (Priority: P1)

老師在任務 tab 直接新增、編輯、軟封存任務。版面與學生 tab 一致：班級資訊不再放在每個 tab 的側欄（移到 tab 之上共用），側欄改放新增任務表單。編輯則透過任務列項的「編輯」icon 將該任務資料載入側欄表單。所有設定動作在這一頁完成，不需跳頁。

**Why this priority**: 目前學生 tab 內嵌、任務 tab 卻跳頁到 `/teacher/tasks/[roomId]`，兩種互動模式不一致；又因為班級資訊重複佔據每個 tab 的側欄，任務的完整表單擠不下，才被迫設計成跳頁。**先把班級資訊上提**，問題自然消失。

**Independent Test**: 進入任務 tab → 側欄看到新增任務表單（位置與學生 tab 一致）→ 填表送出 → 任務出現在列表 → 點某任務的「編輯」icon → 側欄表單載入該任務資料 → 改名稱儲存 → 點「封存」icon 確認 → 任務消失 → 進「已封存」看得到。

**Acceptance Scenarios**:

1. **Given** 老師進入任何 tab, **When** 系統渲染頁面, **Then** 班級資訊區塊位於 tab 列之上、所有 tab 共用一份（移除每個 tab 側欄內的重複）
2. **Given** 老師在任務 tab, **When** 老師檢視側欄, **Then** 側欄頂部直接顯示「新增任務」表單（與學生 tab 的「新增學生」表單位置與互動方式完全一致），**沒有「新增任務」按鈕**這層中介
3. **Given** 老師填寫表單（任務名稱、類型、指定座號、截止時間）, **When** 老師按送出, **Then** 任務即時加入列表、表單清空回到「新增」模式
4. **Given** 老師點任務列項的「編輯」icon, **When** 系統載入該任務到側欄表單, **Then** 表單顯示「編輯任務」模式（顯示任務名稱、附「取消編輯」按鈕），儲存後表單回到「新增」模式
5. **Given** 老師點任務列項的「封存」icon, **When** 系統顯示確認對話框（一層，因可還原）, **Then** 確認後 `isArchived = true`、列表立即消失
6. **Given** 老師在任務 tab, **When** 老師點「已封存任務」入口, **Then** 系統列出所有封存任務，每筆可一鍵還原
7. **Given** 老師點任務名稱（不是 icon）, **When** 系統導航, **Then** 跳到 `/teacher/tasks/[roomId]/[taskId]` 細節頁（見 US6），**不在當前頁編輯**
8. **Given** 老師在 `TaskForm` 選擇截止時間, **When** 老師點開日期選單, **Then** **過往日期 MUST 不可選**（disable）；當系統時間經過子夜後，原本可選的「今天」自動變為「過去」
9. **Given** 老師編輯既有任務、且該任務的原截止時間已經是過往（例如上週設定、今天才打開），**When** 老師打開編輯模式, **Then** 系統 MUST 自動清空該截止日欄位（顯示為空），同時顯示一行輔助文字「原截止日 [日期] 已過，請重設或留空」，讓老師可以直接重設或省略不填，不用先手動清掉舊值再改其他欄位
10. **Given** 任務 `status = ACTIVE` 且 `dueDate < now`, **When** 老師端列表渲染此任務, **Then** 列項徽章 MUST 顯示「已截止」而非「進行中」（與學生端鎖定狀態一致）；**status 欄位本身不變**，僅徽章顯示由 status + dueDate 派生
11. **Given** 任務在列表中, **When** 老師檢視列項操作區, **Then** 除「編輯」「封存」icon 外，**依（status, dueDate）組合提供操作按鈕**：
    - `ACTIVE` 未截止 → 「結案」按鈕（一層確認）
    - `ACTIVE` 已截止（dueDate 過往）→ 「延長截止」按鈕（主要）+ 「結案」按鈕（次要，一層確認）
    - `HELPER_COMPLETED` → 「重新開放」按鈕（無需確認）+ 「結案」按鈕（一層確認）
    - `CLOSED` → 「重新開放」按鈕（行為依 dueDate 分流，見下條）
12. **Given** 老師點 ACTIVE 已截止任務的「延長截止」, **When** 系統開啟側欄 `TaskForm` 編輯模式, **Then** 聚焦截止日欄位（自動清空原過往日期，沿用 AS 9），老師重設未來日期儲存後，徽章自動回到「進行中」
13. **Given** 老師點 CLOSED 任務的「重新開放」, **When** 系統判斷 dueDate, **Then**:
    - dueDate < now（主動結案後沒改 dueDate）→ 開啟側欄 `TaskForm` 編輯模式並聚焦截止日欄位，**老師必須重設 dueDate 為未來時間或留空**才能儲存；儲存成功後 status=ACTIVE
    - dueDate 在未來 / 為 null → 直接 PATCH status=ACTIVE，不開表單

---

### User Story 4 - 班級狀況 tab（取代原本的「報表 tab」） (Priority: P1)

報表 tab 重新定位為「班級狀況 tab」。老師進入後**不是**看完整資料表，而是看：

- **警告區**：列出需要注意的事（例：裝置長時間未同步、指定座號 24 小時無登記、即將截止但無進度）。點任一警告 → 跳到對應任務的細節頁。
- **簡易統計**：總任務數、進行中、有異常、已封存等。

不在這個 tab 內展開個別任務的完整登記細節 —— 那是 `/teacher/tasks/[roomId]/[taskId]` 細節頁的職責。

**Why this priority**: 對應 vision.md 第 6 節「老師應該是被通知後的決策者，不是主動監控者」。在主動推送通知機制（open-questions Q4，延後）尚未上線之前，這個 tab 是 MVP 階段最接近的替代：讓老師掃一眼就能看見有沒有要處理的事，而不是被迫翻每個任務的詳細資料。

**Independent Test**: 進入班級狀況 tab → 看到統計卡片與警告區 → 沒有警告時警告區顯示「目前沒有需要注意的事」→ 故意製造異常（讓指定座號靜置 > 24h）→ 警告區出現該任務 → 點警告 → 跳到該任務細節頁。

**Acceptance Scenarios**:

1. **Given** 老師進入班級狀況 tab, **When** 系統渲染頁面, **Then** 頂部顯示簡易統計（總任務數、進行中、有異常數、已封存數）
2. **Given** 房間內無任何異常, **When** 老師查看警告區, **Then** 顯示「目前沒有需要注意的事」之空白狀態（不顯示空白卡片清單）
3. **Given** 房間內有異常（指定座號 24h 無登記、所有人未登記且接近截止、裝置長時間未同步等），**When** 老師查看警告區, **Then** 每一筆異常顯示一張警告卡片（任務名稱、異常類型、發生時間或閾值資訊）
4. **Given** 老師點任一警告卡片, **When** 系統導航, **Then** 跳到對應的 `/teacher/tasks/[roomId]/[taskId]` 細節頁
5. **Given** 班級狀況 tab 與報表細節（細節頁）兩處職責, **When** 開發者實作, **Then** 班級狀況 tab 只做「掃描」（彙總 + 警告），不重複顯示細節頁的完整登記列表

---

### User Story 5 - 介面修正：學生名單元件拆分 (Priority: P2)

`StudentList` 元件因被老師端與小老師端共用，老師端會看到不必要的 checkbox。拆成 `StudentRoster`（老師端，唯讀、列項有編輯/移除 icon）與 `StudentChecklist`（小老師端，可勾選登記）兩個元件，職責清晰。

**Why this priority**: 不影響功能但會引起老師困惑（「這勾選框是幹嘛的」），改動小、價值清楚。

**Independent Test**: 老師進入學生 tab 完全看不到 checkbox；小老師端的登記體驗不變。

**Acceptance Scenarios**:

1. **Given** 老師在 `/teacher/rooms/[id]` 學生 tab, **When** 系統渲染學生列表, **Then** 列項中不包含 checkbox
2. **Given** 小老師在 `/helper/[roomId]/[taskId]` 登記頁, **When** 系統渲染學生列表, **Then** checkbox 行為與原本一致
3. **Given** 元件已拆分, **When** 開發者搜尋 `StudentList`, **Then** 已無此元件；改為 `StudentRoster` 與 `StudentChecklist`

---

### User Story 6 - 任務細節頁（單一任務的完整結果） (Priority: P1)

`/teacher/tasks/[roomId]/[taskId]` 改造為「單一任務的完整結果頁」。這個頁面**只看結果**，不做設定編輯（設定編輯在任務 tab 內完成）。原本的 `/teacher/tasks/[roomId]` 列表頁廢除。

頁面內容包含：任務基本資訊（名稱、類型、指定座號、截止時間、狀態）、完整登記列表（每位學生的繳交狀態 / 成績、登記者座號、登記時間）、未登記學生清單、匯出操作。

**Why this priority**: 這是「班級狀況 tab 點警告」與「任務 tab 點任務名稱」兩條路徑的終點，不存在會讓兩個入口無處可去。

**Independent Test**: 從任務 tab 點任務名稱 → 進入細節頁，看見完整登記資料 → 點匯出 → 行為正確。再從班級狀況 tab 點警告 → 進入同一個頁面。

**Acceptance Scenarios**:

1. **Given** 老師從任務 tab 點任務名稱, **When** 系統導航到 `/teacher/tasks/[roomId]/[taskId]`, **Then** 顯示該任務的完整資訊與所有登記記錄
2. **Given** 老師從班級狀況 tab 點警告卡片, **When** 系統導航, **Then** 跳到對應任務的同一個細節頁
3. **Given** 老師在細節頁查看**繳交類**任務, **When** 系統渲染登記明細, **Then** 登記明細列出**全班每位學生**並標示「已繳 / 未繳」（未登記＝未繳，由「查無 Record」推導，見 data-model 核心原則），已繳者附登記者座號 / 時間；**不另設「未登記」區塊**
4. **Given** 老師在細節頁查看**成績類**任務, **When** 系統渲染, **Then** 登記明細列出已輸入成績者（含成績值、登記者座號 / 時間），並**保留獨立「未登記」區塊**列出尚未輸入成績的學生（成績類的「未登記」與「成績」是不同狀態，不可推導）
5. **Given** 老師在細節頁, **When** 老師點「匯出為列印格式」或「複製為文字」, **Then** 行為與原 spec FR-009 / FR-010 一致
6. **Given** 老師在細節頁, **When** 老師需要修改任務設定（名稱、指定座號等）, **Then** **不在當前頁就地編輯**；返回任務 tab 一律靠側欄導航（與 FR-060 一致，page-header 不放返回 / 回任務 tab 連結）
7. **Given** 舊路由 `/teacher/tasks/[roomId]`（任務列表頁）不再使用, **When** 系統啟動, **Then** 該檔案 MUST 被刪除（網站尚未上線，無 legacy URL 需要處理，不做 redirect handler）

---

### User Story 7 - QRCode 分享改為 modal（取代既有頁面） (Priority: P1)

`/teacher/rooms/[id]/qrcode` 跳頁改為在 `/teacher/rooms/[id]` 內以 modal 展示 QRCode，提供投影 / 截圖 / 傳訊息三種使用情境的單一入口。背景採黑底白卡（投影聚焦）、QRCode 與 6 字短碼視覺重量相當（萬一掃描不到能直接讀出短碼）、提供「進入全螢幕」按鈕呼叫 Fullscreen API。

**Why this priority**: 目前頁面有具體破版問題（雙層白卡溢出 max-w-sm、列印按鈕被擠出 viewport），且跳頁讓 QRCode 被 header / 側欄壓縮無法放大 —— 對應 vision 第 5 節老師「投影 QRCode 給小老師掃」的開場場景無法成立。

**Independent Test**: 老師在 `/teacher/rooms/[id]` 班級資訊區塊點「顯示 QRCode」→ modal 全螢幕黑底開啟 + 班級名 + QRCode（500px 左右） + 短碼（與 QRCode 視覺重量相當）→ 按「全螢幕」進入 Fullscreen → 按 ESC 離開全螢幕，再按 ESC 關 modal → URL 從 `?qr=open` 回到無 query string。

**Acceptance Scenarios**:

1. **Given** 老師在 `/teacher/rooms/[id]` 班級資訊區塊（在 tab 列之上、所有 tab 共用，US3 已定）, **When** 老師檢視, **Then** 區塊內有「顯示 QRCode」按鈕
2. **Given** 老師點「顯示 QRCode」, **When** 系統開啟 modal, **Then** modal 滿版黑色背景（半透明黑）+ 中央白卡，URL 同步寫入 `?qr=open`
3. **Given** modal 開啟, **When** 老師檢視 modal 內容, **Then** 顯示順序為：班級名稱（大字、最顯眼）→ QRCode 圖（邊長 400–520px，含 quiet zone）→ 6 字短碼（字級與 QRCode 視覺重量相當，老師與學生皆可一眼讀清）
4. **Given** modal 開啟, **When** 老師檢視操作區, **Then** 提供：「進入全螢幕」（Fullscreen API）、「複製代碼」、「複製連結」三個按鈕；**移除「列印 QRCode」**
5. **Given** 老師點「複製代碼」或「複製連結」, **When** 系統複製到剪貼簿, **Then** 以 **toast** 提示成功 / 失敗，**不使用 `alert()`**
6. **Given** 老師點「進入全螢幕」, **When** 系統呼叫 `document.documentElement.requestFullscreen()`, **Then** modal 撐滿整個螢幕（無瀏覽器網址列），ESC 可離開全螢幕
7. **Given** modal 開啟, **When** 老師按 ESC 或點 modal 背景外側, **Then** modal 關閉，URL 移除 `?qr=open`
8. **Given** 使用者帶 `?qr=open` 進入 `/teacher/rooms/[id]`, **When** 頁面渲染, **Then** modal 自動開啟（含 LINE / 信件分享後直接進入此狀態）
9. **Given** 舊路由 `/teacher/rooms/[id]/qrcode` 不再使用, **When** 系統啟動, **Then** 該檔案 MUST 被刪除（網站尚未上線，無 legacy URL 需要處理，不做 redirect handler）

---

### User Story 8 - Dashboard 雙視角改造（按班級 / 按任務）+ 側欄重構 (Priority: P1)

`/teacher`（dashboard）目前是「班級卡片列表」+「新增班級」按鈕，本質是房間清單頁，沒有監測功能。對應 vision 第 6 節「老師應該是被通知後的決策者」+ open-questions「導師 vs 科任老師」議題，本 US 重新設計為：頂部簡易統計 + 主要區 tab 切換（按班級檢視 / 按任務檢視），讓兩種老師都能找到自己需要的視角。

側欄當前的「班級」按鈕（`TeacherSidebar.tsx` line 65）是個偽按鈕：href 與儀表板相同、點下去無導航效果。本 US 一併重構，加入「我的班級」可展開清單作為跨班級導航中樞。

**Why this priority**: dashboard 是老師第一個看到的畫面，現狀讓老師「進來後得自己一個個班級點開檢查」，違背 vision 全部目標；且未顧及科任老師對「跨班級找同名任務」的真實需求。

**Independent Test**: 老師進入 dashboard → 頂部看到簡易統計 → 預設 tab「按班級檢視」顯示每班一張卡片（待辦數、異常數、最近活動）→ 切到「按任務檢視」看到所有進行中任務（每筆標班級歸屬、有異常者插旗）+ 搜尋框可 filter 任務名 → 側欄「我的班級」可展開清單、有異常的班級旁顯示紅點。

**Acceptance Scenarios**:

1. **Given** 老師進入 `/teacher`, **When** 系統渲染頁面, **Then** 主畫面結構為：page-header（右上「新增班級」按鈕）+ 頂部簡易統計（班級數、進行中任務數、異常數）+ 主要區（tab 切換：「按班級檢視」/「按任務檢視」，預設 tab 依班級數而定見 AS 1a / 1b）
1a. **Given** 老師擁有 1 個班級（導師情境）, **When** 系統決定預設 tab, **Then** **預設為「按任務檢視」**（按班級檢視只有 1 張卡片無資訊價值，直接進任務視角更實用）
1b. **Given** 老師擁有 ≥ 2 個班級（科任情境）, **When** 系統決定預設 tab, **Then** **預設為「按班級檢視」**（先看跨班整體輪廓，再決定深入哪一班 / 任務）
2. **Given** 老師在「按班級檢視」tab, **When** 系統渲染, **Then** 顯示該老師所有班級卡片網格，每張卡片含：班級名（大字）、進行中任務數、**異常數紅點**（無異常時不顯示）、最近活動時間（最後一筆登記或建立時間）
3. **Given** 老師點任一班級卡片, **When** 系統導航, **Then** 跳到 `/teacher/rooms/{id}`
4. **Given** 老師在「按任務檢視」tab, **When** 系統渲染, **Then** 顯示頂部「🔍 搜尋任務名稱」搜尋框 + 跨班級的**所有進行中任務**清單（依最近活動時間排序，最近在上）
5. **Given** 老師在「按任務檢視」, **When** 老師檢視單一任務列項, **Then** 顯示「[班級名] · [任務名] · 已登記比例 · 狀態徽章」格式；**異常任務 MUST 插旗（紅色 alert icon）**，且異常類型在 hover / 點擊時顯示
6. **Given** 老師在「按任務檢視」搜尋框輸入文字, **When** 系統 filter, **Then** **即時過濾**（typing 過程中即過濾，不需按 enter）任務清單，比對範圍為任務名稱（不分大小寫、模糊匹配）；搜尋為空時恢復全部任務
7. **Given** 老師點「按任務檢視」中任一任務列項, **When** 系統導航, **Then** 跳到 `/teacher/tasks/{roomId}/{taskId}` 細節頁
8. **Given** 老師全部班級皆無進行中任務, **When** 「按任務檢視」渲染, **Then** 顯示空白狀態「還沒有進行中的任務喔」+ 隱藏搜尋框
9. **Given** 老師擁有 0 個班級, **When** 系統渲染 dashboard, **Then** 主要區顯示空白狀態「來建立第一個班級吧」+「新增班級」按鈕（不顯示 tab）
10. **Given** 老師擁有 ≥ 1 個班級, **When** 老師檢視側欄, **Then** 「我的班級」可展開為班級清單，每筆顯示班級名 + **待辦數 + 異常數紅點**（無異常時不顯示紅點，無待辦時顯示班級名即可）
11. **Given** 老師擁有 0 個班級, **When** 老師檢視側欄, **Then** 「我的班級」仍可展開，清單顯示「還沒建立班級喔」+「新增班級」按鈕
12. **Given** 老師點側欄「我的班級」中的班級項目, **When** 系統導航, **Then** 跳到 `/teacher/rooms/{roomId}`
13. **Given** 側欄目前的「班級」偽按鈕（href 與 dashboard 相同）, **When** 系統重構, **Then** 該項目 MUST 被移除
14. **Given** 老師在任何尺寸瀏覽 `/teacher/*` 路徑（dashboard 除外）, **When** 老師檢視 page-header, **Then** **頁面內「返回儀表板」/「返回房間」連結 MUST 移除**（所有返回 / 跨頁導航統一靠側欄）
15. **Given** 老師在小螢幕（< 768px、側欄自動收合）, **When** 老師檢視 page-header, **Then** 左側顯示 hamburger 按鈕（`lucide:menu`），點擊開出側欄抽屜（包含「儀表板」「我的班級」「設定」），避免無法返回
16. **Given** 老師擁有多個班級（科任情境）, **When** 老師檢視 dashboard 簡易統計, **Then** 統計數字 MUST 為跨班級加總（例「3 個班 / 共 12 個進行中任務 / 共 2 個異常」），而非單班數字
17. **Given** 老師擁有 1 個班級（導師情境）, **When** 老師檢視 dashboard 簡易統計, **Then** 統計顯示「1 個班 / 5 個進行中 / 1 個異常」，數字結構不變（一致性 > 個別優化）

---

### Edge Cases

- Excel 匯入時，**檔案本身就有重複座號**（不只是與既有資料衝突）：系統需偵測檔案內部衝突並拒絕。
- 軟刪除的學生在 Excel 範本下載時應**不出現**（避免重複新增），但可在「已移除」入口看到。
- 已被封存的任務若有未同步的離線登記資料進來，**仍接受寫入**並保留，但畫面不顯示；老師還原任務後可見。
- 編輯學生座號時，若新座號已被其他學生使用，系統拒絕並提示衝突。
- 任務的指定座號對應到已被軟刪除的學生：系統顯示「指定座號 X（學生已移除）」提示老師重新指定。

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-020**: 系統 MUST 提供 Excel 範本檔下載入口，範本至少包含「座號」「姓名」兩欄與一列範例資料
- **FR-021**: 系統 MUST 支援老師上傳 .xlsx 檔案批次匯入學生
- **FR-022**: Excel 匯入 MUST 採全或無策略：任一筆衝突即整批拒絕，並列出每一筆衝突的列號、欄位、原因
- **FR-023**: Excel 匯入 MUST 同時檢查檔案內部衝突（重複座號、重複姓名）與與既有資料的衝突
- **FR-024**: 系統 MUST 提供學生編輯功能（修改姓名與座號），編輯介面採**側欄 inline 表單 + 模式切換**，與任務編輯（FR-029）共用同一套互動樣式；**不使用 modal**
- **FR-025**: 系統 MUST 提供學生軟刪除功能（`isRemoved = true`），刪除後主清單不顯示但歷史記錄保留
- **FR-026**: 系統 MUST 提供「已移除學生」入口，列出所有 `isRemoved = true` 的學生，並支援一鍵還原
- **FR-027**: 系統 MUST 在 `/teacher/rooms/[id]` 的所有 tab 之上提供共用的「班級資訊」區塊，每個 tab 的側欄不再重複顯示班級資訊
- **FR-028**: 系統 MUST 在任務 tab 側欄頂部以**內嵌表單**呈現新增任務介面（位置、互動模式與學生 tab 的新增學生表單一致），**不採用「右上按鈕」或側拉面板**
- **FR-029**: 系統 MUST 在任務列項提供「編輯」icon；點擊時將該任務資料載入側欄表單（表單切換為「編輯任務」模式），共用同一個表單元件
- **FR-030**: 系統 MUST 在任務列項提供「封存」icon；封存採 soft delete（`isArchived = true`），主清單不顯示，但歷史登記記錄保留
- **FR-031**: 系統 MUST 為 Task 增加 `isArchived` 欄位，預設為 false；與既有 `status` 欄位獨立
- **FR-032**: 系統 MUST 提供「已封存任務」入口，列出所有封存任務並支援還原
- **FR-033**: 系統 MUST 將原「報表 tab」重新定位為「班級狀況 tab」（暫定名），內容包含簡易統計（總數 / 進行中 / 異常 / 封存）與警告區（異常任務清單）
- **FR-034**: 班級狀況 tab 點任一警告 MUST 導航到對應任務的細節頁 `/teacher/tasks/[roomId]/[taskId]`
- **FR-035**: 異常判斷條件 MUST 至少包含：指定座號 24h 無登記、所有人未登記且接近截止；具體閾值寫入 plan.md
- **FR-036**: 系統 MUST 改造 `/teacher/tasks/[roomId]/[taskId]` 為單一任務的「結果頁」：顯示任務資訊、完整登記列表、匯出操作；**不在此頁編輯任務設定**。登記明細呈現依任務類型：
  - **繳交類**：登記明細列出**全班每位學生**並標示「已繳 / 未繳」（未登記＝未繳，由「查無 Record」推導），已繳者附登記者 / 時間；**不另設「未登記」區塊**
  - **成績類**：登記明細列出已輸入成績者，並**保留獨立「未登記學生」清單**（成績類的「未登記」與「成績」是不同狀態，不可由缺記錄推導出成績）
- **FR-037**: 刪除舊路由檔案 `src/app/teacher/tasks/[roomId]/page.tsx`（網站尚未上線、無 legacy URL 需要處理，不做 redirect handler）
- **FR-038**: 老師端的學生列表 MUST NOT 顯示 checkbox；StudentList 元件 MUST 拆分為 StudentRoster（老師端）與 StudentChecklist（小老師端）
- **FR-039**: `TaskForm` 的截止日欄位 MUST 阻擋老師選擇過往日期（HTML 層 `min` + 提交前驗證雙重保險）；錯誤訊息：「截止日不能選過去喔」
- **FR-040**: 編輯既有任務時若原 `dueDate` 已是過往，系統 MUST 自動清空截止日欄位並顯示輔助文字「原截止日 [日期] 已過，請重設或留空」（**對應原則**：vision 第 3 節「不做把老師變成執行者」—— 不讓老師花無謂的步驟手動清掉舊值）
- **FR-041**: 老師端任務列項徽章 MUST 由 `(status, dueDate)` 派生顯示，**不依賴自動修改 status**：
  - `status = ACTIVE && dueDate >= now` → 「進行中」
  - `status = ACTIVE && dueDate < now` → 「已截止」（與學生端鎖定狀態視覺一致）
  - `status = HELPER_COMPLETED` → 「小老師已標記完成」
  - `status = CLOSED` → 「已結案」
- **FR-042**: 系統 MUST 在任務 tab 列項依 `(status, dueDate)` 組合提供操作按鈕：
  - ACTIVE 未截止 → 「結案」（一層確認）
  - ACTIVE 已截止 → 「延長截止」（主要）+ 「結案」（次要，一層確認）
  - HELPER_COMPLETED → 「重新開放」（無確認）+ 「結案」（一層確認）
  - CLOSED → 「重新開放」（行為依 dueDate 分流，見 FR-043）
- **FR-043**: 「延長截止」與「重新開放 CLOSED 且 dueDate 過往」共用同一個 UX：開啟側欄 `TaskForm` 編輯模式 + 聚焦截止日欄位（套用 FR-040 自動清空舊值的規則）；老師重設 dueDate 為未來時間或留空後儲存，系統依按鈕來源決定後續：
  - 來自「延長截止」→ status 保持 ACTIVE，徽章自動由「已截止」變回「進行中」
  - 來自「重新開放」→ status 變為 ACTIVE
- **FR-044**: 「重新開放」CLOSED 且 dueDate 為未來 / null 的任務 → 直接 PATCH status=ACTIVE，不開表單（這是「老師主動結案後又改變主意」的情境）
- **FR-045**: 系統 MUST 在 `/teacher/rooms/[id]` 的班級資訊區塊提供「顯示 QRCode」按鈕，點擊開啟 `QRCodeModal`；**不再跳頁到獨立 QRCode 頁**
- **FR-046**: `QRCodeModal` 採滿版黑色半透明背景 + 中央白卡，內容含班級名（大字）、QRCode 圖（邊長 400–520px、保留 quiet zone）、6 字短碼（字級與 QRCode 視覺重量相當）
- **FR-047**: `QRCodeModal` MUST 提供三個操作按鈕：「進入全螢幕」（Fullscreen API）、「複製代碼」、「複製連結」；**移除原本的「列印 QRCode」入口**
- **FR-048**: 複製成功 / 失敗的回饋 MUST 使用 toast，**禁止使用 `alert()`**（與 vision 第 1 節「不要過度確認」原則一致：成功狀態不該打斷操作）
- **FR-049**: `QRCodeModal` 開啟時 URL MUST 同步寫入 `?qr=open`；關閉時 MUST 移除該 query；訪問帶 `?qr=open` 的 URL MUST 自動開啟 modal
- **FR-050**: 刪除舊路由檔案 `src/app/teacher/rooms/[id]/qrcode/page.tsx`（網站尚未上線、無 legacy URL 需要處理，不做 redirect handler）
- **FR-051**: Dashboard (`/teacher`) 主畫面結構 MUST 重構為：page-header（右上「新增班級」）+ 頂部簡易統計（班級數、進行中任務數、異常數，**跨班級加總**）+ 主要區（tab 切換）
- **FR-052**: Dashboard 主要區 MUST 提供兩個 tab：「按班級檢視」/「按任務檢視」；**預設 tab 依班級數而定**：1 班 → 預設「按任務檢視」（避免單張卡片浪費版面）；≥ 2 班 → 預設「按班級檢視」（先給輪廓）。使用者主動切換的 tab 偏好 MAY 暫存於 sessionStorage（不持久化，避免下次班級數變動造成預設邏輯與記住的偏好衝突）
- **FR-053**: 「按班級檢視」MUST 顯示每班一張卡片，含班級名（大字）、進行中任務數、異常數紅點（無異常時不顯示）、最近活動時間；點卡片跳 `/teacher/rooms/{id}`
- **FR-054**: 「按任務檢視」MUST 顯示頂部搜尋框（佔位文字「🔍 搜尋任務名稱」）+ 跨班級**所有進行中任務**清單；每筆顯示「[班級名] · [任務名] · 已登記比例 · 狀態徽章」；**異常任務 MUST 插旗（紅色 alert icon）**
- **FR-055**: 「按任務檢視」搜尋 MUST 為即時 filter（typing 即過濾），比對任務名稱（不分大小寫、模糊匹配）；搜尋為空時恢復全部
- **FR-056**: 「按任務檢視」任務列項點擊 MUST 跳到 `/teacher/tasks/{roomId}/{taskId}` 細節頁
- **FR-057**: Dashboard 資料 MUST 透過新 endpoint `GET /api/teachers/[id]/dashboard` 取得，回傳結構包含：班級清單（每班含 inProgressTaskCount、anomalyCount、lastActivityAt）、跨班級任務清單（每筆含 roomId、roomName、task 基本資訊、isAnomaly、anomalyReason）、簡易統計
- **FR-058**: `TeacherSidebar.tsx` line 65 的「班級」偽按鈕（href 與 dashboard 相同）MUST 移除
- **FR-059**: 側欄 MUST 新增「我的班級」可展開項目；展開後列出該老師所有班級，每筆顯示班級名 + 待辦數 + 異常數紅點；點班級項目跳轉至 `/teacher/rooms/[id]`；0 班時顯示「還沒建立班級喔」+「新增班級」按鈕
- **FR-060**: 所有 `/teacher/*`（dashboard 以外）的 page-header MUST 移除「返回儀表板」/「返回房間」連結；統一靠側欄導航
- **FR-061**: 小螢幕（< 768px）下側欄自動收合，page-header 左側 MUST 顯示 hamburger 按鈕（`lucide:menu`），點擊開出側欄抽屜

### Non-Functional Requirements

- **NFR-004**: Excel 匯入 30 筆學生的處理時間 MUST 不超過 3 秒
- **NFR-005**: 軟刪除 / 軟封存與還原操作 MUST 不影響歷史登記記錄的完整性
- **NFR-006**: 互動模式判斷規則 MUST 寫入 `specs/ui-spec.md`：
  - 同一個畫面內若有跨 tab 重複的內容（如班級資訊），MUST 抽到 tab 列之上共用，**不在每個 tab 的側欄各放一份**
  - 高頻 / 結構簡單的新增與編輯（學生、任務）採側欄**內嵌表單**，不採側拉或 modal
  - Soft delete / 封存等可逆動作只需一層確認對話框；硬刪除（若存在）才需兩層
  - 進階 / 低頻操作（如批次匯入、單筆深入瀏覽）可採跳頁
- **NFR-007**: 小螢幕下任務新增表單採接受堆疊的策略，不額外為小螢幕設計 modal 變體（理由：老師主要使用桌機 / 大平板）

### Key Entities (delta only)

- **Student**: 已有 `isRemoved` 欄位（見 `specs/data-model.md`），本 feature 啟用此欄位的軟刪除流程
- **Task**: **新增** `isArchived: Boolean`（預設 false），用於老師封存任務；與既有 `status` 欄位（ACTIVE / HELPER_COMPLETED / CLOSED）獨立

---

## Success Criteria *(mandatory)*

- **SC-010**: 老師完成 30 人班級的初始學生匯入時間不超過 2 分鐘（含下載範本、填表、上傳）
- **SC-011**: 老師看到班級狀況 tab 後，3 秒內能說出「現在有沒有要處理的事」
- **SC-012**: 老師在 8 個任務的房間裡，從進入任務 tab 到完成一次新增任務的時間不超過 30 秒
- **SC-013**: 老師端介面在程式碼搜尋 `Checkbox` 時，學生列表元件不再出現
- **SC-014**: 老師端任務 tab 與學生 tab 的「新增表單」位置一致，使用者無需在兩個 tab 間調整視線焦點

---

## Assumptions

- 老師使用的環境可以下載與編輯 .xlsx 檔案（桌機 / 平板皆需支援）
- 老師不會大量誤刪資料；soft delete 提供緩衝即足夠，不需多層確認
- 任務的「異常」定義在 MVP 階段先以兩個簡單規則處理（指定座號 24h 無登記、所有人未登記且接近截止），複雜規則延後

---

## 文件影響

| 文件 | 影響 |
|---|---|
| `specs/data-model.md` | 新增 Task.isArchived 欄位（delta 由本 spec 描述，預期實作時同步更新 schema） |
| `specs/001-little-teacher-helper/spec.md` | 不直接修改；本 feature 為其擴充 |
| `specs/ui-spec.md` | 新增「互動模式判斷規則」段落，引用 NFR-007 |
| `specs/open-questions.md` | 不影響（本 feature 涵蓋的問題均已決定） |

收尾時以 `spec-align` skill 確認上述影響皆已套用。
