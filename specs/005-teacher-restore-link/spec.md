# Feature Specification: 老師換裝置還原連結 (Teacher Restore Link)

**Feature Branch**: `feature/preparation-for-online`（本 feature 未獨立開 `005-*` 分支，隨「上線前準備」分支一併實作）
**Created**: 2026-07-28
**Status**: 已實作（spec 後補）
**Input**: 老師身份 `teacherId` 過去只存在瀏覽器 localStorage、全站無登入與還原入口 —— 換電腦或換瀏覽器後 localStorage 清空即找不回班級，即使老師知道自己的 `teacherId` 也無介面可用。接上 Cloudflare D1（共享雲端 DB）後，補上「把已知 `teacherId` 帶到新裝置」的最小入口。

**前置依賴**: `specs/001-little-teacher-helper/`、`specs/002-class-management/` 已實作完成。**且資料層已完成 Prisma → Drizzle + Cloudflare D1 遷移**（見 git PR #10~#13 / `src/lib/db.ts` 的 `getDb()`）—— 這是本 feature 的硬前置：沒有跨裝置共享的雲端 DB，`teacherId` 在新裝置的 DB 裡查無資料，還原連結沒有意義。本 feature 在其上補齊入口，不取代原 spec。

---

## 實作先行說明（本 feature 的特殊狀態，先讀）

**本 feature 為「先完成功能、後補 spec」。** 功能已於 `feature/preparation-for-online` 分支實作並在本機（dev server）逐情境實測通過（commit：`feat(teacher): 換裝置/換瀏覽器還原連結`）；本文件為**事後補寫的回溯規格**，用途有二：

1. 記錄已落地的行為與設計決策，補齊 `specs/` 對此功能的缺口（避免功能存在於程式卻無 spec 佐證）。
2. 作為後續「真正登入 / `teacherId` 撤銷與輪替」的延伸基準（見 Assumptions 的已知限制）。

因此：Status 標為「已實作（spec 後補）」；下方 Acceptance Scenarios 描述的是**已通過的實測行為**，而非待驗收的目標；`plan.md` 記錄的是已採用的技術決策與其理由（非施工計畫）。本 feature **不需 `tasks.md`**（功能已完成，無工序待拆）。

---

## 對應原則（簡述，完整內容見 `specs/vision.md`）

- **可逆性決定保護強度**（原則一）→ 「覆蓋既有身份」是不易復原的動作（要有原老師的還原連結才切得回），故**不同老師的連結覆蓋前 MUST 確認**；無效連結 **MUST NOT** 順手清掉本機既有資料。
- **鷹架不是黑盒**（原則三）→ 連結無效時 MUST 明確告知「連結有誤」，MUST NOT 靜默落入「建立老師帳號」而讓老師誤以為班級資料不見了。
- **責任在使用者，但不放大洩漏面** → `teacherId` 是無登入的 bearer token，責任本就在使用者保管；但 URL 比 localStorage 更易外流（歷史紀錄 / 書籤 / Referer / 連結預覽），故 **MUST 讀完即清網址**，並與學生的班級 QRCode **強區隔**以防老師誤把帳號連結給學生。

**混淆風險的不對稱性**（本 feature 的核心安全考量）：老師還原連結誤給學生 = 整個老師帳號（所有班級）控制權外流；學生班級連結誤給老師 = 頂多多加一個班。方向錯了的後果嚴重得多，故入口文案、位置、視覺皆刻意與學生分享區隔。

**路由地圖（本 feature 涉及）**:

```
設定選單（SettingsMenu，僅 sidebar / 老師端 variant）  ← 「複製我的還原連結」入口（US1）
/teacher?tid=<teacherId>                              ← 還原入口；由 /teacher 頁 mount effect 處理（US2 / US3）
                                                         刻意「無獨立 restore 路由」，避免與 /join/[code] 混淆
/join、/join/[code]                                   ← 學生入口（既有，本 feature 不改；僅作區隔對照）
```

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 複製我的還原連結 (Priority: P1)

老師在設定選單（語言切換之下）看到「複製我的還原連結」；點擊時**先跳警告彈窗**（像密碼一樣保管、別給學生），按「我知道了，複製連結」後才把 `${origin}/teacher?tid=<teacherId>` 複製到剪貼簿並以 toast 回饋。此入口**只在老師端出現、且本機已有 `teacherId` 時才顯示**；學生（小老師）端不得出現。

**Why this priority**: 這是整個還原機制唯一的產生入口。`teacherId` 是 UUID，人工抄寫不可行；用連結承載才可用。警告用 modal 而非 toast，是為了確保老師「讀完」洩漏風險才複製（toast 會來不及讀）。

**Independent Test**: 老師端有 `teacherId` → 開設定選單 → 見「複製我的還原連結」（語言切換下方）→ 點擊 → 跳警告彈窗（標題「這是你的專屬還原連結」+ 內文含「別給學生」）→ 按「我知道了，複製連結」→ 剪貼簿為 `${origin}/teacher?tid=<自己的 id>` + toast「還原連結已複製，請妥善保管」。學生端開設定選單 → 無此按鈕。

**Acceptance Scenarios**:

1. **Given** 老師端（`SettingsMenu` sidebar variant）且 localStorage 有 `teacherId`, **When** 展開設定選單, **Then** 於語言切換之下顯示「複製我的還原連結」按鈕
2. **Given** 學生端（`SettingsMenu` floating variant），或本機無 `teacherId`, **When** 展開設定選單, **Then** **MUST NOT** 顯示該按鈕
3. **Given** 老師點「複製我的還原連結」, **When** 系統處理, **Then** 先關閉選單並跳出 `ConfirmDialog`（標題「這是你的專屬還原連結」；內文說明連結等於帳號鑰匙、像密碼一樣保管、千萬別給學生、學生請改用「顯示 QRCode」）
4. **Given** 警告彈窗顯示中, **When** 老師按「我知道了，複製連結」, **Then** 系統將 `${window.location.origin}/teacher?tid=<encodeURIComponent(teacherId)>` 寫入剪貼簿並顯示 toast「還原連結已複製，請妥善保管」
5. **Given** 警告彈窗顯示中, **When** 老師按「取消」/關閉, **Then** 不複製任何內容、無 toast
6. **Given** 剪貼簿寫入失敗（權限 / 環境不支援）, **When** 系統 catch, **Then** 顯示 error toast「複製失敗，請手動複製」

---

### User Story 2 - 在新裝置/瀏覽器還原身份 (Priority: P1)

老師把還原連結貼到新裝置或新瀏覽器開啟 `/teacher?tid=<id>`；系統驗證該 `teacherId` 存在後，寫回 `teacherId` + `teacherName` 到 localStorage 並進入儀表板，且**網址上的 `?tid=` 讀完即清**。本機原本沒有身份（乾淨裝置）時，此還原為靜默、無額外確認。

**Why this priority**: 這是本 feature 要解決的核心問題（換裝置找回資料）的兌現路徑。刻意**不做獨立 restore 路由**，還原邏輯直接在 `/teacher` 頁的 mount effect 處理，避免多一個與 `/join/[code]` 形似的路徑造成混淆，也讓「清網址」只需一次。

**Independent Test**: 乾淨裝置（localStorage 無 `teacherId`）→ 開 `/teacher?tid=<有效 id>` → 短暫載入 → 進入 `/teacher`（乾淨網址、無 `?tid=`）→ 側欄顯示該老師姓名、班級為其資料。

**Acceptance Scenarios**:

1. **Given** 本機無 `teacherId`, **When** 開啟 `/teacher?tid=<有效 id>`, **Then** 系統呼叫 `GET /api/teachers/{tid}` 驗證存在並取得 `name`
2. **Given** 驗證通過且本機無既有身份, **When** 系統處理, **Then** 寫回 `teacherId` + `teacherName` 到 localStorage，並整頁 `window.location.replace('/teacher')`（同一步清掉 `?tid=` 又讓側欄等以 localStorage 為源的元件讀到新身份）
3. **Given** 還原完成, **When** 頁面重載後, **Then** 網址為乾淨的 `/teacher`（不含 `?tid=`），儀表板顯示該老師的班級
4. **Given** 進來的 `tid` 與本機**同一位**老師（`tid === localStorage.teacherId`）, **When** 系統處理, **Then** 視為 no-op，走與 AS2 相同的寫回+replace（結果等同重新整理），**不**跳確認

---

### User Story 3 - 覆蓋既有身份的安全處理 (Priority: P2)

當還原連結與本機既有身份**不一致**、或連結**無效**時，系統依「可逆性」原則保護老師不被意外擠掉或誤導：不同老師的連結覆蓋前要確認；無效連結明確報錯，且對「本機已有 session」與「本機無 session」分流，皆不清除既有資料。

**Why this priority**: 這是把 US2 從「單機順手」升級為「多身份安全」的護欄。靜默覆蓋一個不同老師，會把原老師從該瀏覽器擠掉（無登入時，切回需原老師的連結）；靜默把無效連結當成「沒帳號」則會讓老師誤以為資料遺失。兩者都違反 vision 原則一/三。

**Independent Test**:
（a）本機為 A → 開 `/teacher?tid=<B 的 id>` → 跳確認框「要換成另一位老師嗎？」（內文含 A、B 兩名字與「可切回」）；按「維持 A」→ 留在 A 的儀表板；按「改用 B」→ 切為 B。
（b）本機為 A → 開 `/teacher?tid=<無效>` → 整片不透明覆蓋警示「還原連結無效」，看不到 A 的姓名/班級，localStorage 仍為 A；按「回到我的儀表板」→ 回 A。
（c）本機無身份 → 開 `/teacher?tid=<無效>` → 建立帳號畫面 + 內嵌「連結無效」提示。

**Acceptance Scenarios**:

1. **Given** 本機已有 `teacherId`＝A 且連結 `tid`＝B（B 有效、A≠B）, **When** 系統驗證 B 通過, **Then** 先 `history.replaceState` 清掉 `?tid=`，再跳 `ConfirmDialog`（標題「要換成另一位老師嗎？」；內文含「目前是 A」「連結屬於 B」「A 的資料不會消失，之後用 A 的還原連結就能切回來」；按鈕「維持 A」/「改用 B」）；**此刻尚未變動 localStorage**
2. **Given** 上述確認框, **When** 老師按「改用 B」, **Then** 寫回 B 的 `teacherId`+`teacherName` 並整頁 `replace('/teacher')`（切為 B）
3. **Given** 上述確認框, **When** 老師按「維持 A」, **Then** 關閉確認框、維持 A 身份、載入 A 的儀表板；localStorage 未變動
4. **Given** 連結 `tid` 無效（`GET /api/teachers/{tid}` 非 2xx 或請求失敗）且本機**有** session, **When** 系統處理, **Then** 先 `replaceState` 清 `?tid=`，顯示**整片不透明覆蓋層**（`fixed inset-0`，覆蓋側欄）警示「還原連結無效」；**MUST NOT** 顯示任何原 localStorage 身份/班級，**MUST NOT** 清除 localStorage；提供「回到我的儀表板」按鈕，按下才載入原老師的儀表板
5. **Given** 連結 `tid` 無效且本機**無** session, **When** 系統處理, **Then** 清 `?tid=` 後回「建立老師帳號」畫面，並於表單上方顯示內嵌提示（`restore.linkInvalid`）；不寫入 localStorage
6. **Given** 任一還原路徑（成功 / 確認 / 無效）, **When** 進入頁面後, **Then** 網址列 **MUST NOT** 殘留 `?tid=`（一律先 `replaceState` 清除，或由成功路徑的 `replace('/teacher')` 一併清掉）

---

### Edge Cases

- **`?tid=` 存在但為空字串或缺值**：視為無效連結，走 US3 無效路徑（依有無 session 分流）。
- **`teacherId` 指向「DB 已不存在」的 row**（例如 DB 重置）：`GET /api/teachers/{tid}` 回 404 → 走 US3 無效路徑。註：若改由一般進場（localStorage 直接讀一個 DB 已不存在的舊 id），`GET /teachers/{id}/dashboard` 會回空班級清單而非錯誤 —— 此為既有邊界，不在本 feature 範圍。
- **同 `origin` 但短暫的 `?tid=` 曝露**：非同步驗證期間 `?tid=` 短暫存在於網址列（在 `replaceState` 之前）—— 屬 URL 承載密鑰的固有取捨，已由「一進頁就先 `replaceState`」壓到最短窗口。
- **老師誤把還原連結貼給學生**：不在系統可攔截範圍（責任在使用者）；本 feature 以文案、入口位置、視覺與學生 QRCode 強區隔來降低誤給機率。
- **覆蓋層背後的 DOM**：不透明覆蓋層只保證「畫面上」看不到原身份；原身份文字節點仍存在於覆蓋層背後的 DOM（與本專案其他 modal 一致）。若未來要求連 DOM / 螢幕報讀器層級都不含原資訊，需改由 layout 層在該狀態不渲染側欄身份（已知限制，非本 feature 範圍）。

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-130**: 設定選單（`SettingsMenu` sidebar / 老師端 variant）MUST 在本機有 `teacherId` 時，於語言切換之下顯示「複製我的還原連結」；學生端（floating variant）或無 `teacherId` 時 **MUST NOT** 顯示
- **FR-131**: 點「複製我的還原連結」MUST 先跳警告彈窗（`ConfirmDialog`），內容 MUST 含「像密碼一樣保管」「千萬別給學生」「學生請改用顯示 QRCode / 班級代碼」；MUST 用 modal 而非 toast（確保讀畢）
- **FR-132**: 僅於老師在警告彈窗按確認後，才將 `${window.location.origin}/teacher?tid=<encodeURIComponent(teacherId)>` 寫入剪貼簿並以 success toast 回饋；取消則不複製、無 toast；寫入失敗顯示 error toast
- **FR-133**: 還原連結 MUST 指向 `/teacher?tid=<teacherId>` 由 `/teacher` 頁的 mount effect 處理；**MUST NOT** 新增獨立 restore 路由（避免與 `/join/[code]` 形似造成混淆）
- **FR-134**: `/teacher?tid=` 進來時 MUST 呼叫 `GET /api/teachers/{tid}` 驗證存在並取得 `name`，據此決定還原 / 確認 / 無效分支
- **FR-135**: 還原成功（無既有身份或同一位老師）MUST 寫回 `teacherId`+`teacherName` 後 `window.location.replace('/teacher')`（整頁重載，使側欄等以 localStorage 為源的元件讀到新身份；同一步清掉 `?tid=`）
- **FR-136**: 進來的 `tid` 與本機既有 `teacherId` **不同**且 `tid` 有效時，覆蓋前 MUST 跳確認框（顯示 from/to 兩位老師姓名、告知原資料不會消失且可用原連結切回）；確認才覆寫+重載，取消則維持原老師並載入其儀表板，**皆不得在確認前變動 localStorage**
- **FR-137**: 連結無效（API 非 2xx 或請求失敗）且本機**有** session 時，MUST 以整片不透明覆蓋層（覆蓋側欄）顯示「連結無效」警示，**MUST NOT** 顯示任何原 localStorage 身份/班級，**MUST NOT** 清除 localStorage；提供按鈕返回原儀表板
- **FR-138**: 連結無效且本機**無** session 時，MUST 回「建立老師帳號」畫面並顯示內嵌無效提示；不寫入 localStorage
- **FR-139**: 任一還原路徑 MUST 於進頁後盡早以 `history.replaceState` 清除網址上的 `?tid=`（或由成功路徑的整頁 `replace('/teacher')` 一併清除），使網址列不殘留 `teacherId`
- **FR-140**: 本 feature 所有對使用者顯示文字 MUST 集中於 `src/messages/zh-TW.ts` 與 `en.ts` 的 `teacher.restore.*`（NFR-001）；中英雙語

### Non-Functional Requirements

- **NFR-017**: 還原連結承載 `teacherId`（bearer token），系統 MUST 以「讀完即清網址」壓低其於瀏覽器歷史 / 書籤 / Referer 的曝露；MUST NOT 將 `teacherId` 置於任何會被外送的位置以外的用途（本 feature 僅用於本機還原）
- **NFR-018**: 老師端讀取 `teacherId` 供入口顯示判斷 MUST 為 SSR-safe（採 `useSyncExternalStore`，沿用 `TeacherSidebar` 讀 `teacherName` 的慣例），避免 hydration 不一致與 lint `set-state-in-effect`

### Key Entities (delta only)

無新增 entity。沿用既有 `Teacher`（`specs/data-model.md` §1）；`teacherId` 作為無登入的 bearer token，`email` 欄位（data-model 註記「用於未來登入」）在本 feature **未使用** —— 本 feature 是「未來登入」到位前的過渡還原機制。無 schema 變更。

---

## Success Criteria _(mandatory)_

- **SC-033**: 老師在新裝置/瀏覽器貼上有效還原連結後，10 秒內回到自己的儀表板並看到既有班級（含一次整頁重載時間）
- **SC-034**: 還原完成後，瀏覽器網址列不含 `?tid=`（程式碼與實測皆驗；FR-139）
- **SC-035**: 以「另一位老師」的連結進入既有 session 的瀏覽器時，未經確認 **不會** 覆蓋本機身份（FR-136）
- **SC-036**: 以無效連結進入既有 session 的瀏覽器時，畫面 **不顯示** 原老師姓名/班級，且 localStorage 的 `teacherId`/`teacherName` **未被清除**（FR-137）
- **SC-037**: 程式碼搜尋不存在獨立的 `app/teacher/restore` 路由；還原邏輯集中於 `/teacher` 頁（FR-133）

---

## Assumptions

- 已完成 Cloudflare D1 遷移且線上為單一共享 DB —— 否則新裝置的 DB 查無該 `teacherId`，還原不成立（硬前置，見上）。
- `teacherId` 為無登入的 bearer token：**永久、不可撤銷、涵蓋該老師所有班級**。這是**已知限制** —— 一旦連結外流即永久有效，無法輪替或註銷。真正的登入 / token 撤銷與輪替為後續 feature，本 feature 是其到位前的過渡入口（延伸基準見本 spec）。
- 保管與防範誤發的責任在使用者，與現有無登入設計一致；本 feature 不改變授權模型，只補入口並以「讀完即清網址 + 與學生 QRCode 強區隔」兩道防護避免放大洩漏面。
- `NEXT_PUBLIC_APP_URL` 在複製連結時**不採用**，改用 `window.location.origin`（client 端點擊時的真實網域），避免 prod 誤指到 `.env` 內的 localhost。

---

## 文件影響

| 文件 | 影響 |
| --- | --- |
| `specs/001-little-teacher-helper/spec.md` | 不直接修改；本 feature 補其「老師身份持久化 / 換裝置」的缺口 |
| `specs/data-model.md` | 不改 schema；本 feature 澄清 `Teacher.email`「用於未來登入」與本過渡機制的關係（可於收尾補一句註記） |
| `specs/d1-cloudflare-migration`（memory / git PR #10~#13） | 本 feature 為其「換裝置還原」故事的最後一塊（雲端保險箱 + 插鑰匙的入口） |
| `specs/ui-spec.md` | 可補「還原連結入口與學生 QRCode 的區隔規範（文案 / 位置 / 覆蓋層警示）」段落 |
| `src/messages/zh-TW.ts`、`en.ts` | 已新增 `teacher.restore.*`（copyLink / warn* / linkCopied / copyFailed / linkInvalid / switch* / invalid*） |

收尾時以 `spec-align` skill 確認上述影響皆已套用。
