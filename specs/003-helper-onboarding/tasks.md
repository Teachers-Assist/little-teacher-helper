# Tasks: 003 小老師進場與身份體驗

**Input**: `specs/003-helper-onboarding/spec.md`
**Prerequisites**: 001 已實作完成；可與 002 平行（無共用程式碼，但 002 的 Toast / Modal 基礎元件若已建立可重用）

**Tests**: 暫不包含測試任務（與 001 / 002 一致）

**Organization**: Tasks 按 User Story 分組

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、無相依）
- **[Story]**: US1=掃碼入口, US2=進場儀式, US3=身份視覺強化, US4=換座號

---

## Phase 1: Foundational

- [ ] T201 [P] 準備自我聲明印章音效檔（< 30KB，輕量短促 ≤ 0.3 秒，置於 `public/sounds/stamp.mp3`）
- [ ] T202 [P] 新增 `src/hooks/useFailureCounter.ts`：頁面層 in-memory 失敗計數 hook，支援閾值與升級回呼（FR-065 / NFR-010）
- [ ] T203 [P] 新增 `src/hooks/useHaptic.ts`：封裝 Vibration API（不支援時 noop），給自我聲明印章與其他可能需要 haptic 的場景共用

**Checkpoint**: 共用工具就緒

---

## Phase 2: User Story 1 — 掃碼入口簡化與錯誤兒童化 (Priority: P1)

**Goal**: `/join` 介面簡化、錯誤兒童語氣、自動降級到輸入框、連續失敗升級為找老師

**Independent Test**: 進入 `/join` 看到「開始掃描」單一按鈕、無中介虛線框 → 拒絕相機 → 自動退回 + 焦點切輸入框 → 連續錯 3 次 → 升級訊息

### UI 改造

- [ ] T204 [US1] 修改 `src/app/join/page.tsx`：
  - 移除 line 71-83 的「點此開啟相機」中介虛線框
  - 改為預設顯示「相機圖示 + 開始掃描」單一狀態（樣式對齊使用者附圖）
  - 移除 line 61-68 的「取消掃描」按鈕（掃描狀態下使用者要切換到手動輸入由捲動完成）
- [ ] T205 [US1] 修改 `src/components/QRScanner.tsx`（如已存在）或新增包裝層：
  - 處理相機權限被拒事件 → 觸發 onPermissionDenied callback
  - 處理 `getUserMedia` 不支援事件 → 觸發 onUnsupported callback
- [ ] T206 [US1] 在 `src/app/join/page.tsx` 串接 T205 的兩個 callback：
  - onPermissionDenied → 退回「開始掃描」狀態 + 顯示提示文字 + `inputRef.current?.focus()`
  - onUnsupported → 隱藏相機區塊 + `inputRef.current?.focus()`
- [ ] T207 [US1] 在 `src/app/join/page.tsx` 引入 `useFailureCounter(threshold=3)` 包圍房間碼提交流程：
  - 提交失敗 → counter++
  - counter ≥ 3 → 切換錯誤訊息為「試了好幾次都沒成功，去找老師看看吧」
  - 成功登入 → reset counter
- [ ] T208 [US1] 在 `src/lib/qrcode.ts` 或新建 `src/lib/qrcode-validator.ts` 補上「掃描結果是否為本系統 QRCode」的判斷：
  - 解析 URL 是否為 `/join/[code]` 結構
  - 不是 → 觸發「這個碼好像不是老師給的喔，再對一次嗎？」

### 離線判斷

- [ ] T209 [US1] 在 `/join/page.tsx` 加上離線提示：若 `useNetworkStatus().isOnline === false`，顯示「現在沒有網路喔，先去找一個有 WiFi 的地方再試試」（同時隱藏相機與輸入區，或顯示為 disabled 狀態）

### i18n

- [ ] T210 [P] [US1] 新增 / 修改 i18n keys：
  - `qr.startScan`（取代 `qr.tapToOpenCamera`）
  - `qr.permissionDenied`、`qr.cameraUnsupported`
  - `qr.codeNotFound`、`qr.codeNotFoundRetry`、`qr.failureUpgrade`
  - `qr.roomInactive`、`qr.noNetwork`、`qr.codeNotOurs`
  - 移除：`qr.tapToOpenCamera`、`qr.cancelScan`

**Checkpoint**: `/join` 簡潔、錯誤都有兒童語氣與具體出路

---

## Phase 3: User Story 2 — 進場儀式（過場 + 自我聲明印章） (Priority: P1)

**Goal**: `/join/[code]` 由狀態頁改為過場頁；選座號後出現全螢幕自我聲明印章

**Independent Test**: 掃碼進入 `/join/[code]` → 慶祝 icon + 大字班級名 1.5–2 秒自動進選座號 → 選座號 → 全螢幕「我是 24 號 王小明」+ 音效 + haptic 停 1.5 秒 → 進任務清單

### UI 元件

- [ ] T211 [P] [US2] 新增 `src/components/JoinTransition.tsx`：歡迎過場元件，props 含 roomName 與 onComplete callback；內部用 `setTimeout(1.5–2s)` 觸發 onComplete；icon 用 `lucide:party-popper` 或 `lucide:hand`；班級名為畫面最大、最醒目元素
- [ ] T212 [P] [US2] 新增 `src/components/IdentityStamp.tsx`：自我聲明印章元件，props 含 seatNumber、studentName 與 onComplete callback：
  - 全螢幕 overlay
  - 顯示「我是 [seatNumber] 號 [studentName]」
  - 觸發 `new Audio('/sounds/stamp.mp3').play()`（包 try/catch，autoplay 失敗 silent）
  - 觸發 `useHaptic()` 短震
  - `setTimeout(1500)` 後 onComplete
  - 點擊不可跳過（不接 onClick）

### 頁面整合

- [ ] T213 [US2] 修改 `src/app/join/[code]/page.tsx`：
  - 取代既有「成功狀態頁」UI（line 89-103）
  - 拉成三段 state machine：`welcoming` → `seatSelecting` → `stamping` → 跳 `/helper/[roomId]`
  - `welcoming` 渲染 `<JoinTransition>`
  - `seatSelecting` 渲染既有 `<SeatSelector>`
  - 選了座號 → 切到 `stamping` 渲染 `<IdentityStamp>`
  - 印章 onComplete → `saveRoom / saveStudents / saveTasks` 後 `router.push`

### i18n

- [ ] T214 [P] [US2] 新增 / 修改 i18n keys：
  - `join.welcomeTitle`（取代「進來了！歡迎加入班級！」改為更明確或保持，待定）
  - `join.identityStampPrefix`（「我是」）+ `join.identityStampSeatLabel`（「號」）
  - 移除：原 `join.joinSuccess`（已轉變為過場）

**Checkpoint**: 小老師進房間有明確的儀式感與承諾裝置觸發

---

## Phase 4: User Story 3 — 登記畫面身份視覺強化 (Priority: P1)

**Goal**: 拿掉中間 banner、登記者 badge 從 header 移到名單外框上方並加標籤、依「指定 / 未指定 / 沒指定他人」三種狀態分流視覺、移除繳交統計 badge

**Independent Test**: 進入登記頁 → header 沒有座號 badge → 名單外框正上方有大「登記者：[號]」badge → 受指定者有星星 + 動畫 + 小行字、未指定者有不同色 + 小行字、沒指定任何人時無小行字 → 學生名單上方沒有「N 已繳」「N 未繳」徽章

### UI 元件

- [ ] T215 [US3] 新增 `src/components/RecorderBadge.tsx`（如已存在則改造）：
  - 接收 `seatNumber`、`assignmentState: 'assigned' | 'notAssigned' | 'noAssignment'` props
  - 內部依 state 渲染不同視覺：
    - `assigned`：星星 icon + fade-in 動畫（僅播 1 次，用 `useEffect` mount 觸發）+ 下方小行字「你是老師指定的登記者！」
    - `notAssigned`：非警告色（建議灰藍系，例：`bg-slate-100 text-slate-700`）+ 下方小行字「你不是被指定的小老師>\_<」
    - `noAssignment`：中性色（純黑邊白底）+ 無下方小行字
  - 接受可選 `onClick` prop（US4 換座號流程用）

### RecordForm 改造

- [ ] T216 [US3] 修改 `src/components/RecordForm.tsx`：
  - **移除** line 62-72 的中間「指定就是你」banner（FR-072）
  - **移除** line 83-87 的 `hasRecorded` 觸發顯示邏輯與 `RecorderBadge`（badge 改為常駐，由 T217 重新組裝）
  - **移除** line 91-103 的繳交統計 badge（FR-073）
- [ ] T217 [US3] 修改 `src/components/RecordForm.tsx`：
  - 在學生名單卡片（line 90 起的 `card-sm`）**外框正上方**插入 `<RecorderBadge>` 元件，計算 `assignmentState`：
    - `task.assignedSeatNumber == null` → `noAssignment`
    - `task.assignedSeatNumber === mySeatNumber` → `assigned`
    - 其他 → `notAssigned`
- [ ] T218 [US3] 修改 `src/app/helper/[roomId]/[taskId]/page.tsx`：
  - 移除 line 149-152 的 header 右上座號 badge（FR-070）

### i18n

- [ ] T219 [P] [US3] 新增 / 修改 i18n keys：
  - `record.recorderLabel`（「登記者：」）
  - `record.assignedHint`（「你是老師指定的登記者！」）
  - `record.notAssignedHint`（「你不是被指定的小老師>\_<」）
  - 移除：`identity.isAssigned` / `identity.notAssigned`（資訊已併入 badge）
  - 移除：`record.statusHeader` / `record.submittedCount` / `record.notSubmittedCount`（FR-073）

**Checkpoint**: 登記頁的身份視覺強化完成，承諾裝置在每次登記時都看得到

---

## Phase 5: User Story 4 — 換座號流程 (Priority: P2)

**Goal**: 點登記者 badge 跳彈窗、確認後清 cache 跳 `/join`；網路統一由 `/join` 接手

**Independent Test**: 點 badge → 彈窗顯示 → 確認 → 跳 `/join` 並看到對應狀態（線上 / 離線）；取消 → 不變

### UI / 流程

- [ ] T220 [US4] 修改 `src/components/RecorderBadge.tsx`（T215）：接 `onClick` prop，使整個 badge 可點擊（指標游標 + hover 效果）
- [ ] T221 [US4] 修改 `src/app/helper/[roomId]/[taskId]/page.tsx`：
  - state 控制換座號 confirm dialog 開關
  - badge `onClick` → 開 dialog
  - 確認 → `clearRoom(roomId)`（呼叫 `src/lib/offline/storage.ts` 的清除函式，若無則新增）→ `router.push('/join')`
- [ ] T222 [P] [US4] 確認 `src/lib/offline/storage.ts` 有 `clearRoom(roomId)` 函式；若無則新增（清掉 room / seatNumber / students / tasks / records / queue 中與此 roomId 相關的全部 entries）

### i18n

- [ ] T223 [P] [US4] 新增 i18n keys：
  - `room.changeSeatTitle`（「想換座號嗎？」）
  - `room.changeSeatMessage`（「需要重新進入房間喔」）
  - `room.changeSeatConfirm`（「重新進入」）

**Checkpoint**: 小老師有明確的換座號退路；網路狀態由 `/join` 統一處理

---

## Phase 6: 文件對齊

- [ ] T224 在 `specs/ui-spec.md` 新增「進場儀式 / 自我聲明印章 / 兒童語氣文案規範」段落
- [ ] T225 執行 `spec-align` skill 檢查所有文件一致（含 i18n 對齊；待使用者擴充 spec-align skill）

**Checkpoint**: 003 feature 完整收尾

---

## 依賴關係

```
T201–T203 (Foundational)
    │
    ├─→ T204–T210 (US1 掃碼入口) ── 依賴 T202 (useFailureCounter)
    │
    ├─→ T211–T214 (US2 進場儀式) ── 依賴 T201 音效 + T203 useHaptic
    │
    ├─→ T215–T219 (US3 身份視覺強化)
    │       │
    │       └─→ T220–T223 (US4 換座號，依賴 RecorderBadge onClick)
    │
    └─→ T224–T225 (Phase 6 文件對齊)
```

**關鍵相依**:

- US1 / US2 / US3 三條可平行開發
- US4 依賴 US3 的 RecorderBadge 已建立（需加 onClick）
- 音效檔 T201 可由設計師 / 老師直接提供 mp3，無需開發者
- 002 的 Toast 元件（T146）若已建立可供 US1 升級訊息使用，否則本 feature 暫用內嵌錯誤訊息

---

## 給 AI agent 的實作指引

1. **接手時請先讀 `spec.md` 而非從這份檔案開始**：spec 告訴你 why，tasks 告訴你 where
2. **每完成一個 task 將 `[ ]` 改為 `[x]`**，並在 PR 描述引用 task ID
3. **「兒童語氣」文案不要硬寫進元件**：所有 user-facing 文字 MUST 走 i18n（對應 001 NFR-001）
4. **動畫 / 音效要克制**：vision 第 4 節「不要把學生當小孩對待」—— 不要每個操作都閃光發聲；星星動畫只播 1 次、音效短促
5. **若實作中發現 spec 寫錯**：改 spec、跑 `spec-align`、再改 code，不要反過來
