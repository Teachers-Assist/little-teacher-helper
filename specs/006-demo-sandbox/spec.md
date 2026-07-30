# Feature Specification: 推廣用示範沙盒 (Demo Sandbox)

**Feature Branch**: `006-demo-sandbox`（尚未獨立開分支，可比照 005 隨現行「上線前準備」分支實作）
**Created**: 2026-07-29
**Status**: 草稿（待實作）
**Input**: 為了推廣，讓使用者一點進網頁就有一個「已經建好的班級 + 幾個任務」可以立刻操作，親手體驗老師端與小老師端，並看見「登記 → 同步 → 老師看到」的完整迴圈。此體驗必須是**純前端沙盒**，不碰雲端 D1，彼此裝置/來源互不影響，且使用者要清楚知道「這是示範，不是我自己的班級」。

**前置依賴**: `specs/001` ~ `005` 已實作。示範**重用既有的展示元件與純函式**（尤其 `src/lib/anomalyDetection.ts` 的 `detectAnomalies`），但**不重用會寫入 D1 的 API 路徑**。

---

## 為什麼是「純前端沙盒」（先讀：架構的硬約束）

推廣需求有六條硬約束，把實作方式收斂到單一架構：**示範資料只存在使用者當下的瀏覽器，完全不寫雲端 D1。**

| 需求 | 沙盒如何滿足 |
| --- | --- |
| 1 點進來就能操作、任務體現特色 | 種子資料預先建好，秒進可玩；三個任務各展示一種特色（見 §種子資料） |
| 2 不汙染正式使用 | 完全不呼叫寫 D1 的 API，雲端一列都不增加 |
| 3 不被誤當自己的班級 | 獨立入口 `/demo`；**絕不寫入 `teacherId`/`teacherName`**；全程常駐「示範模式」標示 |
| 4 多人／多裝置／多來源互不影響 | 資料在各自瀏覽器的記憶體 / sessionStorage，天然隔離，無任何共享點 |
| 5 不會無限擴充 | 沒有真資料被建立；關閉分頁即回收；無需清理排程 |
| 6 引導開始使用 | 沙盒內放**非攔截式**的柔性 CTA「建立我自己的班級」，不逼迫、不塞廣告 |

**這條「不寫 D1」是本 feature 最高約束**：任何提議「在雲端建臨時 demo 房」的做法都同時威脅需求 2/4/5，且極易把 demo 身份寫進 localStorage 而違反需求 3，一律不採用。

---

## 對應原則（簡述，完整內容見 `specs/vision.md`）

- **鷹架不是黑盒（原則三）** → 示範必須讓使用者隨時知道「我在示範模式、我現在看的是哪一端」。跨端同步、斷線重連都要用文字說明「系統正在做什麼」，而非只有動畫；呼應數位素養的「為什麼」時刻（上傳後老師同學看得到、沒網路先存本機）。
- **不把學生當小孩（刻意不做三）** → 小老師端示範沿用正式感的介面，不因為是 demo 就卡通化。
- **誠實商店（原則四）** → 示範的異常提醒 MUST 用真實的 `detectAnomalies` 純函式跑種子資料，讓警示是「真的算出來的」而非寫死，維持系統可信度。

**路由地圖（本 feature 涉及）**:

```
/                         首頁：新增「試用看看」次要入口（不取代兩個角色入口）
/demo                     示範舞台（老師端視角為主）；獨立入口，MUST NOT 寫 teacherId
/demo/helper              小老師端示範；由 /demo 的（假）QRCode 出示畫面內按鈕以「新視窗」開啟（window.open）
                          刻意與 /join、/teacher 區隔——示範不經過真實掃碼、不經過真實建帳號
```

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 從首頁進入示範，且明確知道「這不是我的班級」 (Priority: P1)

使用者在首頁看到「試用看看」次要入口，點進 `/demo`，立刻看到一個已建好的班級與任務。頁面**頂部常駐「示範模式」標示帶**（例如「這是示範班級，你的操作不會被儲存，也不會影響任何真實班級」），並提供「建立我自己的班級」與「重新開始示範」兩個動作。整個過程**不寫入任何真實老師身份**。

**Why this priority**: 這是需求 3（不被誤當自己的班級）與需求 2（不汙染）的守門。獨立入口 + 常駐標示 + 不寫 `teacherId`，是「使用者不會不知不覺把 demo 當自己的班級一直用下去」的技術與體驗雙保險。

**Independent Test**: 首頁 →「試用看看」→ `/demo` → 見種子班級與任務 + 頂部「示範模式」帶。檢查 localStorage：`teacherId`/`teacherName`/`little-helper-offline-data` **皆未被建立或變動**。

**Acceptance Scenarios**:

1. **Given** 首頁, **When** 使用者瀏覽, **Then** 除既有「我是老師 / 我是小老師」兩入口外，MUST 顯示一個**次要**「試用看看」入口（視覺層級低於兩個正式入口）
2. **Given** 進入 `/demo`, **When** 頁面載入, **Then** MUST 於頂部顯示常駐「示範模式」標示帶，內含「不會被儲存 / 不影響真實班級」說明，並提供「建立我自己的班級」與「重新開始示範」
3. **Given** 在 `/demo` 做任何操作（登記、切換、開小老師端視窗）, **When** 檢查 localStorage, **Then** `teacherId`、`teacherName`、`little-helper-offline-data` **MUST NOT** 被寫入或變動
4. **Given** 使用者點「重新開始示範」, **When** 系統處理, **Then** 示範狀態回到初始種子（清掉本 session 的示範登記），不影響任何真實資料

---

### User Story 2 - 老師端種子班級與三個特色任務（含異常提醒） (Priority: P1)

`/demo` 以老師端視角呈現一個種子班級：班級狀況、三個任務、以及**由真實 `detectAnomalies` 算出的異常提醒**。三個任務分別體現：繳交與否（SUBMISSION）、成績數值（GRADE）、以及一個觸發「任務停擺」警示的任務。

**Why this priority**: 這是需求 1（任務體現專案特色）的核心，尤其異常提醒是本專案「讓老師敢放手」的招牌功能。

**Independent Test**: `/demo` 載入 → 見三個任務；其中「同意書」為繳交型、「小考」為成績型、「午餐費」觸發「任務停擺」警示，且該警示由 `detectAnomalies` 對種子資料算出（非寫死）。

**Acceptance Scenarios**:

1. **Given** `/demo` 載入, **When** 顯示老師端, **Then** MUST 呈現種子班級的班級狀況（在籍人數、各任務登記進度）與三個任務（見 §種子資料）
2. **Given** 種子中的「午餐費（繳交型）」任務其活動時間戳（無登記則退回 `createdAt`）設為超過停擺閾值（24h）, **When** 老師端渲染, **Then** MUST 透過真實 `detectAnomalies` 產生 `TASK_STALLED` 警示並顯示於老師端（與正式老師端一致的呈現）
3. **Given** 成績型任務「數學小考」, **When** 使用者查看, **Then** MUST 呈現成績數值與班級成績概況，體現「只能輸入數字」的資料型別特色
4. **Given** 繳交型任務「校外教學同意書」, **When** 使用者查看, **Then** MUST 呈現全班繳交狀況（已交 N／未交 M），體現社會壓力數字

> **異常規則的選定**：示範採**已實作的規則一「任務停擺」（`TASK_STALLED`，24h 無登記活動）**，實作於 `anomalyDetection.ts:58-69`，dashboard 與 monitoring endpoint 皆呼叫。它同時是「裝置長時間未同步」的代理訊號，與 US4 的斷線重連主題天然呼應（裝置離線 → 沒有新資料進來 → 表現為任務停擺）。
>
> 註（規則盤點澄清）：規則二「截止日零登記」（`NO_RECORDS_BY_DUE`，截止日當天 08:00 台北、全班零登記）**同樣已實作**，若日後想改用「截止急迫感」框架可替換；真正未實作的是另一條「截止**前** X 小時、登記率偏低（非零）」候選（`anomaly-rules.md` 第 173 行）。

---

### User Story 3 - 出示（假）QRCode → 新視窗模擬小老師端，並明確標示這是模擬 (Priority: P1)

`/demo` 上有一個「顯示 QRCode」動作（呼應正式老師端出示 QRCode 的真實流程，體現「免帳號即用：老師出示 QRCode」特色）。點擊後彈出**QRCode 出示畫面**：畫面內是一個**假的 QRCode**（僅供呈現、不導向真實加入流程），其**下方有一個按鈕**寫著「用新視窗模擬小老師端」，並附一句說明「實際上小老師是掃這個 QRCode 進入；示範用此按鈕代替掃描」。按下該按鈕才以 `window.open` 開新視窗載入 `/demo/helper`，代表「一台學生的平板」。

**Why this priority**: 使用者選定「另開視窗」承載小老師端，並要求把「掃碼」這個真實動作也演出來。關鍵是**不能讓使用者誤以為這是真實掃碼流程**——用「出示假 QRCode + 畫面內按鈕」兩層清楚傳達：QRCode 是老師出示動作的模擬、按鈕代替「拿另一台裝置掃描」（原則三：不黑盒）。

**Independent Test**: `/demo` 點「顯示 QRCode」→ 彈出畫面含假 QRCode，其下方有「用新視窗模擬小老師端」按鈕與說明 → 點該按鈕 → 新視窗開啟 `/demo/helper`，視窗內頂部有明確說明「這是模擬掃碼後的小老師端，此視窗代表一台學生平板」；小老師端沿用正式感介面（不卡通化），可選座號、看到種子任務。

**Acceptance Scenarios**:

1. **Given** `/demo`, **When** 使用者點「顯示 QRCode」, **Then** MUST 彈出 QRCode 出示畫面，內含一個**假 QRCode**（僅呈現、不可掃入真實流程）與其**下方**一個按鈕「用新視窗模擬小老師端」+ 一句說明「實際上小老師是掃這個 QRCode 進入；示範用此按鈕代替掃描」
2. **Given** QRCode 出示畫面, **When** 使用者點「用新視窗模擬小老師端」, **Then** MUST 以 `window.open` 開新視窗載入 `/demo/helper`，並盡量以尺寸/位置參數讓其可置於主視窗旁（利於對照觀看）
3. **Given** `/demo/helper` 新視窗, **When** 載入, **Then** 頂部 MUST 顯示模擬說明：「這是**模擬**：實際上小老師是掃老師的 QRCode 進入；此視窗代表一台學生的平板」，且入口動作用「按鈕」而非真實掃碼 UI
4. **Given** 小老師端示範, **When** 使用者操作, **Then** 沿用既有小老師端的進場/選座號/登記體驗（正式感、不卡通化），資料源為種子與本 session 示範狀態
5. **Given** 手機瀏覽器（`window.open` 多半表現為新分頁、無法與主視窗並排）, **When** 使用者點「用新視窗模擬小老師端」, **Then** 仍 MUST 以 `window.open` 開啟 `/demo/helper`（手機上為新分頁）；**不做同頁 fallback**。跨分頁同步照常走同源 `BroadcastChannel`（見 Assumptions 支援度）。「手機看不到兩端並存、需自行切換分頁對照」為**已知限制**
6. **Given** `window.open` 被瀏覽器彈窗攔截, **When** 開啟失敗, **Then** MUST 提示使用者允許彈窗後再試（不可靜默失敗），MUST NOT 退回同頁呈現

---

### User Story 4 - 斷網 → 登記 → 重整資料仍在 → 重連同步，老師端看到 (Priority: P1)

小老師端示範**不提供假的「模擬斷線 / 重連」開關**，改以**文字提示**引導使用者親自操作真實網路，親手驗證：

1. **關掉裝置網路 → 在小老師端登記 → 重新整理網頁**：頁面**仍載得回**（靠專案的手寫 service worker `public/sw.js`，見 Assumptions），資料**不會消失**（本機持久，體現「離線可用、資料不遺失」）。
2. **重新連上網路**：剛才的登記**自動同步**到老師端視窗（體現「連線後自動同步」）。

示範以**真實網路狀態**（`navigator.onLine` 與 `online`/`offline` 事件，重用既有 `useNetworkStatus`）驅動「待同步 → 已同步」與跨視窗同步的**時機**：離線期間登記標示「已存在本機、待同步」且 hold 住不 broadcast；`online` 事件到達時才依序 flush，透過同源 `BroadcastChannel` 通知老師端視窗。

**Why this priority**: 這是需求 1 的招牌特色（離線可用、自動同步、資料不遺失），也是使用者明確要求的呈現方式。**讓使用者親手關網、重整、看到資料還在**，比看一段假動畫更有說服力，直接對應 vision 的兩個數位素養「為什麼」時刻（沒網路先存本機、同步後老師同學看得到）；並與 US2 的停擺警示呼應（裝置離線 → 沒有新資料進來 → 表現為任務停擺）。

**Independent Test**（於 production build、且已在線載過 `/demo/helper` 一次）: 開小老師端新視窗 → 依畫面文字提示關閉裝置網路 → 勾選某位同學「已繳交」→ 該筆顯示「待同步」、老師端視窗**尚未**出現 → **重新整理小老師端網頁** → 頁面由 SW 從快取載回、該筆登記**仍在**（未消失）→ 重新連上網路 → 該筆轉「已同步」、老師端視窗**出現**該筆登記。

**Acceptance Scenarios**:

1. **Given** 小老師端示範, **When** 呈現, **Then** MUST 以文字提示引導使用者「關掉網路 → 登記 → 重整看資料還在 → 重連看同步」（單則、精簡，屬 US6 特色 hint 家族）；MUST NOT 提供假的斷線/重連按鈕
2. **Given** 裝置實際離線（`navigator.onLine === false` 或收到 `offline` 事件）, **When** 使用者登記, **Then** 該筆 MUST 標示「已存在本機、待同步」，且 MUST NOT broadcast 至老師端視窗（用真實網路狀態 gate 同步時機）
3. **Given** 離線期間已登記、且該頁曾在線載過（SW 已快取其 HTML 與 JS chunk）, **When** 使用者重新整理小老師端網頁, **Then** 頁面 MUST 由 service worker 從快取載回（`public/sw.js`：導覽 network-first→該網址快取；靜態 cache-first）、示範狀態由 sessionStorage 還原、該筆登記**不消失**
4. **Given** 裝置重新連線（收到 `online` 事件）, **When** 有待同步登記, **Then** 那幾筆 MUST 依序 flush、逐一由「待同步」轉為「已同步」，並透過 `BroadcastChannel` 通知老師端視窗
5. **Given** 老師端視窗正開著, **When** 收到同步事件, **Then** MUST 更新對應任務的班級狀況（登記出現、進度數字更新），呈現「同步後老師就看得到」
6. **Given** 裝置在線時的正常登記, **When** 使用者登記, **Then** MUST 近即時反映到老師端視窗（連線中即時同步）
7. **Given** 老師端視窗已關閉, **When** 小老師端重連同步, **Then** 不得報錯；下次老師端視窗重新開啟時 MUST 反映示範狀態的最新結果（示範狀態以可存續的載體保存，見 NFR）

---

### User Story 5 - 柔性引導使用者建立自己的班級 (Priority: P2)

示範中適當時機（例如完成一次同步後）以**非攔截式**方式邀請使用者建立自己的班級，導向 `/teacher`。不得使用強制彈窗、倒數、或任何廣告式手法。

**Why this priority**: 這是需求 6（引導開始使用）的兌現，但使用者已明確要求「不可強力逼迫或硬塞廣告」，故限定為非攔截式、低頻、可忽略。

**Independent Test**: 完成一次示範同步 → 出現一則可忽略的邀請（例如老師端一句「喜歡嗎？建立你自己的班級只要填個名字」+ 按鈕）→ 點擊導向 `/teacher`；不點也不影響繼續玩示範。

**Acceptance Scenarios**:

1. **Given** 使用者在示範中完成一次有意義的操作（如一次重連同步）, **When** 系統呈現引導, **Then** MUST 為非攔截式（inline 提示或可關閉的輕量橫幅），MUST NOT 為強制 modal / 倒數 / 廣告
2. **Given** 引導出現, **When** 使用者點「建立我自己的班級」, **Then** 導向 `/teacher`（正式建帳號流程，沿用現有低摩擦入口）
3. **Given** 使用者忽略引導, **When** 繼續操作, **Then** 示範照常運作，不重複強推

---

### User Story 6 - 隨畫面變化的「一句話」特色提示（hint） (Priority: P2)

在示範頁面壓一層**輕量、單則**的提示（hint），依**當前路由 / 畫面上的功能**，用一句話點出對應的專案特色，並在合適處邀請使用者動手試（例如小老師端：「試試關掉網路再登記，資料會先存本機，重連後自動同步、不會不見」）。此提示 MUST 小、字少、一次只顯示一則、可忽略，且與「示範模式標示帶」（安全說明）和建班引導（轉換）在視覺與功能上分離。

**Why this priority**: 需求 1（體現特色）的臨場化——在使用者正看著某功能時，用一句話點出它的特色，呼應 vision 原則三的「為什麼」時刻；但刻意限制為單句、可忽略，不變成大段教學文字（避免把示範變成說明書）。

**Independent Test**: 在老師端看異常提醒時，hint 一句話點出「當任務發生異常（停擺、登記率過低）會顯示，老師不用一直監督小老師」；切到小老師端時，hint 換成邀請「關網路→登記→重連」試離線同步；兩處提示皆為單句、可關閉。

**Acceptance Scenarios**:

1. **Given** 老師端顯示異常提醒, **When** 該畫面呈現, **Then** hint MUST 指向該特色（文案：「當任務發生異常（停擺、登記率過低）會顯示，老師不用一直監督小老師」）
2. **Given** 小老師端示範, **When** 呈現, **Then** hint MUST 邀請使用者試離線同步（如「試試關掉網路再登記——資料會先存在本機，重連後自動同步、不會不見」）
3. **Given** 任一 hint, **When** 呈現, **Then** MUST 為**單則、精簡**（建議一句、約 ≤ 30 字），MUST 可忽略/可關閉或自動輪替，MUST NOT 為大塊文字或攔截式
4. **Given** hint 與示範模式標示帶、建班引導同頁, **When** 三者並存, **Then** MUST 在視覺與功能上分離、不疊加成資訊牆（同一時間畫面上的引導性文字量 MUST 受控）

---

### Edge Cases

- **使用者把 `/demo` 網址分享給別人**：對方開啟得到的是同一份種子的全新示範（各自 session、互不影響），符合需求 4。
- **同一瀏覽器同時開多個 `/demo` 分頁**：各分頁為獨立示範 session；`BroadcastChannel` 訊息以示範 session 識別隔離，避免 A 分頁的同步跑到 B 分頁的老師端（實作需帶 session 識別）。
- **小老師端新視窗被瀏覽器攔截**：走 US3 AS6——提示使用者允許彈窗後再試，不可靜默失敗、不退回同頁。
- **示範狀態在重整後**：以 sessionStorage 存續（同分頁重整不丟）；關閉分頁即回收（不做跨 session 持久化，守需求 5）。
- **真實使用者剛好也在同一台裝置用正式功能**：示範命名空間與正式 `little-helper-offline-data` / `teacherId` 完全分離，互不干擾（NFR-019）。

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-141**: 首頁 MUST 新增一個**次要**「試用看看」入口導向 `/demo`，視覺層級 MUST 低於「我是老師 / 我是小老師」兩個正式入口
- **FR-142**: `/demo` 為獨立示範入口，MUST NOT 寫入或變動 `teacherId`、`teacherName`、`little-helper-offline-data`；示範不呼叫任何會寫入 D1 的 API
- **FR-143**: `/demo` MUST 於頂部常駐「示範模式」標示帶，說明「不會被儲存、不影響真實班級」，並提供「建立我自己的班級」與「重新開始示範」
- **FR-144**: `/demo` MUST 載入一份預建種子（班級 + 學生 + 三個任務，見 §種子資料），三個任務 MUST 分別體現繳交型、成績型、與觸發異常提醒
- **FR-145**: 異常提醒 MUST 由真實 `src/lib/anomalyDetection.ts` 的 `detectAnomalies` 對種子資料算出（非寫死），示範採規則一 `TASK_STALLED`（24h 無登記活動）
- **FR-146**: `/demo` MUST 提供「顯示 QRCode」動作，點擊後彈出 QRCode 出示畫面，內含**假 QRCode**（僅呈現、不導向真實加入流程）與其**下方**按鈕「用新視窗模擬小老師端」+ 說明；點該按鈕才以 `window.open` 開 `/demo/helper`，MUST 盡量帶尺寸/位置參數以利與主視窗並列對照
- **FR-147**: `/demo/helper` MUST 於頂部明確標示「這是**模擬**掃碼後的小老師端、此視窗代表一台學生平板」，入口動作用按鈕取代真實掃碼 UI；小老師端沿用正式感介面（不卡通化）
- **FR-148**: 小老師端示範 MUST NOT 提供假的「模擬斷線 / 重連」開關；改以**文字提示**引導使用者親自關網 / 重整 / 重連。MUST 以真實網路狀態（`navigator.onLine` 與 `online`/`offline` 事件，重用 `useNetworkStatus`）驅動同步時機：離線登記 MUST 標示「已存在本機、待同步」且 hold 住不 broadcast；`online` 時 MUST 依序 flush 並逐一轉「已同步」。**離線期間重整**網頁（該頁曾在線載過）時，頁面 MUST 由手寫 service worker（`public/sw.js`）從快取載回、示範狀態由 sessionStorage 還原、登記不遺失（成立前提見 Assumptions）
- **FR-149**: 跨視窗同步 MUST 以同源 `BroadcastChannel` 傳遞，且 MUST 帶示範 session 識別以隔離多分頁；老師端視窗收到事件 MUST 更新對應任務的班級狀況
- **FR-150**: 示範 MUST 於適當時機以**非攔截式**方式引導建立自己的班級（導向 `/teacher`）；MUST NOT 用強制 modal / 倒數 / 廣告；使用者可忽略且不重複強推
- **FR-151**: 「重新開始示範」MUST 將示範狀態清回初始種子，且不影響任何真實資料
- **FR-152**: 本 feature 所有對使用者顯示文字 MUST 集中於 `src/messages/zh-TW.ts` 與 `en.ts`（NFR-001）；中英雙語；小老師端文案 MUST 符合 vision 的兒童友善語氣
- **FR-153**: 示範頁 MUST 提供一個依**當前路由 / 畫面功能**變化的**單則**輕量特色提示（hint）：一句話點出當前特色、並在合適處邀請動手試。MUST 精簡（建議一句、約 ≤ 30 字）、可忽略、一次只顯示一則；MUST NOT 為大塊文字或攔截式；MUST 與「示範模式標示帶」（安全說明）與建班引導（轉換）在視覺與功能上分離

### Non-Functional Requirements

- **NFR-019**: 示範狀態 MUST 使用與正式資料**完全分離的命名空間**（建議 sessionStorage key `little-helper-demo`），與 `little-helper-offline-data`、`teacherId`、`teacherName` 無任何交集；關閉分頁即回收，MUST NOT 做跨 session 持久化（守需求 5）
- **NFR-020**: 示範 MUST NOT 產生任何寫入雲端 D1 的網路請求；可用純函式 / 本機種子完成全部呈現與運算

### Key Entities (delta only)

無新增資料庫 entity、無 schema 變更。示範沿用既有 `Room` / `Student` / `Task` / `Record` 的**型別結構**於本機模擬，但**不落庫**。種子資料為前端常數模組（供 `/demo` 與 `/demo/helper` 共用），非 D1 資料列。

---

## 種子資料（示範內容定義）

一個班級、約 6 位學生、三個任務，各體現一種特色：

- **班級**：`五年二班`，在籍學生 6 位（座號 1–6，姓名用中性化名如「同學一…六」或常見名）。
- **任務 A — 校外教學同意書（SUBMISSION，繳交型）**：種子預設約 4/6 已繳交。體現：繳交與否登記、全班繳交狀況、社會壓力數字（「還剩 2 人未交」）。**這是互動任務**：使用者在小老師端補登剩下的同學，於老師端看見更新。
- **任務 B — 數學小考（GRADE，成績型）**：種子預設數位同學已有成績。體現：成績數值登記、只能輸入數字的資料型別、班級成績概況。
- **任務 C — 午餐費（SUBMISSION，繳交型）**：全班零登記，活動時間戳（無登記則退回 `createdAt`）設為超過停擺閾值（24h 無登記活動）。體現：**異常提醒**——由 `detectAnomalies` 算出 `TASK_STALLED`，老師端顯示「任務停擺」警示。與 US4 斷線主題呼應（沒有新資料進來 = 可能有人卡住 / 裝置沒同步）。

> 種子的時間戳（`createdAt`、記錄的活動時間等）MUST 以「相對於載入當下」計算，確保停擺警示每次載入都穩定觸發、不因絕對日期失效。規則一需「全班未登滿」且距最後活動 ≥ 24h；任務 C 零登記時錨點退回 `createdAt`，故 `createdAt` 取「載入當下 − 超過 24h」即穩定觸發。

---

## Success Criteria _(mandatory)_

- **SC-038**: 使用者從首頁 3 次點擊內可進入 `/demo` 並看到可操作的種子班級與任務
- **SC-039**: 在 `/demo` 完成任意示範操作後，localStorage 的 `teacherId`/`teacherName`/`little-helper-offline-data` **未被建立或變動**（程式檢查 + 實測）
- **SC-040**: 示範全程 **無任何** 寫入 D1 的網路請求（network 面板驗證）
- **SC-041**（於 production build、該頁曾在線載過）: 使用者實際關閉裝置網路後於小老師端登記，老師端視窗不更新；斷網狀態下重整網頁，頁面仍載回且該筆登記仍在（未消失）；重新連上網路後老師端於數秒內看到該筆並顯示「已同步」
- **SC-042**: 老師端顯示的「任務停擺」警示由 `detectAnomalies` 產生 `TASK_STALLED`（程式碼可追溯，非寫死字串）
- **SC-043**: 兩個不同瀏覽器 / 裝置各自開 `/demo`，操作互不影響（無共享後端可驗證）
- **SC-044**: 切換老師端 / 小老師端時，特色提示（hint）內容對應改變且皆為單句；同一時間畫面上不出現多則 hint 疊加

---

## Assumptions

- 示範**不需要**真正的跨實體裝置同步：使用者已於規劃時選定「同台模擬」，跨視窗（同源）以 `BroadcastChannel` 傳遞即足以呈現「登記 → 同步 → 老師看到」。真正「用另一支手機掃碼」的跨裝置體驗不在本 feature 範圍（若日後要，另以 opt-in 臨時儲存處理，不寫正式表）。
- 「另開視窗」在桌機可與主視窗並列對照；**手機 `window.open` 多表現為新分頁、無法並排**，demo **不做同頁 fallback**——手機一律以新分頁開啟 `/demo/helper`，跨分頁靠 `BroadcastChannel` 同步，「看不到兩端並存、需自行切換分頁」為已知限制（US3 AS5）。
- **`BroadcastChannel` 支援度足夠（已查證 caniuse，全球 ~95%、已達 baseline）**：Edge 79+ / Chrome 54+ / Firefox 38+ / Safari 桌機 15.4+ / **iOS Safari 15.4+（2022/03）** / Android Chrome 現代版皆支援。桌機新視窗與手機新分頁的跨 context 同步皆涵蓋。實作 MUST 加 feature-detect（`'BroadcastChannel' in window`），極少數不支援環境（如 iOS < 15.4）則同步時機退化但不崩。**注意**：`window.open` 開的新視窗/分頁雖同源，其 sessionStorage 是開啟當下**複製一份、之後各自獨立**，不會即時共享，故兩端狀態同步**必須**靠 `BroadcastChannel`，不可假設 sessionStorage 互通。
- **斷網重整可載回頁面——由專案的手寫 service worker 支援（已核實現行程式碼）。** `public/sw.js` 對導覽請求採 network-first→該網址快取→`/offline` 後備，對靜態資源（`/_next/static` JS chunk、圖示、字型）採 cache-first；scope 為全站 `/`，涵蓋 `/demo`、`/demo/helper`。註冊於 `src/components/ServiceWorkerRegistration.tsx`。成立前提有三，US4 驗收 MUST 滿足：
  1. **production build**：SW **僅在 `NODE_ENV === 'production'` 註冊**（dev 為避免干擾 HMR 不註冊），故本機 `pnpm dev` 斷網重整仍會白頁；需 `build` + `start`（或部署環境）驗收。
  2. **該頁曾在線載過一次**：network-first 是「載過才快取」HTML、cache-first 於首次載入才快取 JS chunk——demo 流程本就先在線進 `/demo/helper` 才去斷網，自然滿足；但「從未載過就直接斷網開」會落到 `/offline` 後備頁。
  3. **資料還原**：SW 只保證「頁面載得回」，登記由 demo 自己的 sessionStorage（`little-helper-demo`，NFR-019）於 React 啟動後還原；同分頁重整 sessionStorage 保留。
- **跨視窗同步用 `BroadcastChannel`，不經網路**——即使裝置離線它仍可送達。因此 demo「同步需要網路」是**用 `navigator.onLine`/`useNetworkStatus` 主動 gate 同步時機**模擬出來的（離線 hold、`online` 才 flush），並非真的把資料送上雲端；全程仍不碰 D1（NFR-020）。
- 示範重用既有展示元件的可行程度，取決於這些元件是否為 props-driven；若元件內部直接 `fetch` D1 API，需要為示範抽一層本機資料源。實作前需確認耦合度（見 plan.md，待補）。
- 種子姓名使用化名，不使用任何真實學生個資。

---

## 文件影響

| 文件 | 影響 |
| --- | --- |
| `specs/vision.md` | 無需改動；本 feature 是「行銷素材＝學生自治畫面」（第 4 節開發者須知）的落地之一 |
| `specs/anomaly-rules.md` | 無需改規則；本 feature 為規則一 `TASK_STALLED` 的展示場景。可於「沿革」補一句：006 示範重用 `detectAnomalies`。**另發現第 96 行「規則一、二排除繳交類」與程式碼／「已知限制」矛盾（實際不排除），建議另案修正** |
| `specs/data-model.md` | 無 schema 變更；示範以既有型別於本機模擬、不落庫 |
| `specs/ui-spec.md` | 可補「示範模式標示帶 / 模擬視窗說明」的視覺與文案規範 |
| `specs/landing-page/` | 首頁新增「試用看看」次要入口，與 2a 版面協調 |
| `src/messages/zh-TW.ts`、`en.ts` | 需新增 `demo.*`（標示帶 / 模擬說明 / 斷線重連 / 引導 CTA 等），中英雙語 |

收尾時以 `spec-align` skill 確認上述影響皆已套用。

---

*文件狀態：初稿。規模從簡：聚焦「純前端沙盒 + 新視窗模擬小老師端 + 斷線重連同步 + 停擺警示 + 柔性引導」。plan.md / tasks.md 待需要時再補。*
