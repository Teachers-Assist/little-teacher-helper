# Plan: 005 老師換裝置還原連結 (Teacher Restore Link)

**Input**: `specs/005-teacher-restore-link/spec.md`
**前置依賴**: 001 / 002 已實作；**Prisma → Drizzle + Cloudflare D1 遷移已完成**（`src/lib/db.ts` `getDb()`；git PR #10~#13）
**狀態**: 已實作、已本機實測；本 plan 為**回溯記錄**已採用的技術決策與其理由（非施工計畫）
**無 `tasks.md`**: 功能已完成，無工序待拆（spec.md「實作先行說明」已述）

本檔記錄 spec 交由 plan 收斂的技術決策 —— 為何無獨立路由、為何整頁重載、URL 洩漏的緩解、身份比對的分流表 —— 以及檔案落點，供日後接手「真正登入 / token 撤銷」時延伸。

> **接手順序**：先讀 `spec.md`（why 與已通過的行為），再讀本檔（怎麼做、為何這樣做），程式碼落點見第 4 節。

---

## 1. 核心設計決策（三選一的取捨，已定案）

### 1.1 無獨立 restore 路由，還原邏輯放在 `/teacher` 頁

- **決策**：連結為 `/teacher?tid=<teacherId>`，由 `src/app/teacher/page.tsx` 的 mount `useEffect` 讀 `?tid=` 處理；**不**建 `app/teacher/restore/` 路由。
- **理由**：
  1. 少一個與學生 `/join/[code]` 形似的路徑，降低老師誤把「還原連結」當「學生連結」的認知負擔（呼應 spec 的不對稱混淆風險）。
  2. 「清網址」只需一次 —— 成功路徑的 `window.location.replace('/teacher')` 同時完成「清掉 `?tid=`」與「整頁重載」，不必先 `replaceState('/teacher/restore')` 再導頁（曾經的雙清已移除）。
- **曾試而否決**：獨立 `app/teacher/restore/page.tsx` 落地頁。否決後果之一：需要「先 `replaceState` 清 param、再 `replace('/teacher')` 清路由」兩次清網址，冗餘且易誤解。

### 1.2 成功還原用「整頁 `location.replace`」而非 client-side 導頁

- **決策**：寫回 localStorage 後 `window.location.replace('/teacher')`。
- **理由**：側欄 `TeacherSidebar` 以 `useSyncExternalStore(emptySubscribe, …)` 讀 `teacherName` —— `emptySubscribe` 永不通知，client-side 導頁不會讓側欄重讀新身份。整頁重載保證側欄、dashboard 等所有以 localStorage 為源的元件都讀到還原後的身份；`replace`（非 `push`）同時把 `?tid=` 的歷史項替換掉，返回鍵不會回到帶密鑰的網址。

### 1.3 身份比對三分流（覆蓋前的護欄）

驗證 `GET /api/teachers/{tid}` 通過後，依「本機既有 `teacherId`」與 `tid` 的關係分流：

| 情境 | 行為 | 對應 FR |
| --- | --- | --- |
| 本機無 `teacherId` | 靜默寫回 + `replace('/teacher')` | FR-135 |
| `tid === 既有 id`（同一位老師） | 視為 no-op，走與上同的寫回+重載 | FR-135（AS 中 US2-4） |
| `tid ≠ 既有 id`（不同老師，tid 有效） | 先 `replaceState` 清 param → 跳 `ConfirmDialog`（from/to 名字、可切回）→ 確認才覆寫+重載，取消維持原老師 | FR-136 |

無效連結（API 非 2xx / 請求失敗）再依「本機有無 session」二分流（見 1.4）。

### 1.4 無效連結：有無 session 二分流，且「不顯示、不清除」

- **本機有 session**：整片不透明覆蓋層（`fixed inset-0 z-50 bg-[#fffbeb]`，蓋過 `z-index:20` 的側欄）顯示「連結無效」，按鈕才回原儀表板。**不顯示原身份/班級、不清 localStorage**（FR-137）。
- **本機無 session**：回「建立老師帳號」畫面 + 表單上方內嵌 `restore.linkInvalid` 提示（FR-138）。
- **理由**：無效連結但本機有資料時，若靜默落入「建立帳號」會讓老師誤以為班級遺失（違反 vision 原則三）；同時 MUST NOT 因為一條壞連結就動到老師原本好端端的本機身份（原則一，可逆性）。覆蓋層只保證「畫面上」不顯示原資訊；DOM 層仍存在（已知限制，見 spec Edge Cases）。

---

## 2. 安全與洩漏面（spec NFR 的落地細節）

- **讀完即清網址（FR-139 / NFR-017）**：任一路徑一進 effect 就先 `history.replaceState(null,'','/teacher')`（成功路徑則由 `location.replace('/teacher')` 一併清）。壓低 `teacherId` 於瀏覽器歷史 / 書籤 / Referer / 貼進聊天工具被抓預覽的曝露。非同步驗證期間 `?tid=` 的短暫曝露為 URL 承載密鑰的固有取捨，已壓到最短窗口。
- **連結產生用 `window.location.origin`（非 `NEXT_PUBLIC_APP_URL`）**：複製動作在 client 端點擊時發生，`origin` 是當下真實網域；用 env 變數會在 prod 誤帶 `.env` 內的 localhost。
- **與學生 QRCode 強區隔**：入口文案「複製我的還原連結」、位置在設定選單語言切換之下（非學生分享/QR 附近）、複製前的密碼級警告彈窗、連結路徑 `/teacher?tid=` 與 `/join/[code]` 明顯不同 —— 四重區隔對應 spec 的不對稱混淆風險。
- **已知限制（非本 feature 修）**：`teacherId` bearer token 永久、不可撤銷、涵蓋所有班級。外流即永久有效。真正的登入 / token 輪替與撤銷為後續 feature，本 feature 是其到位前的過渡入口。

---

## 3. 實作慣例（與既有程式一致）

- **入口顯示判斷讀 localStorage**：`SettingsMenu` 以 `useSyncExternalStore(emptySubscribe, getStoredTeacherId, () => null)` 讀 `teacherId`（NFR-018），沿用 `TeacherSidebar` 讀 `teacherName` 的 SSR-safe 慣例，避免 hydration 不一致與 lint `react-hooks/set-state-in-effect`。
- **effect 內的 setState**：還原分支的 setState 皆置於 mount effect 內的 async IIFE（非 effect body 同步呼叫），符合專案 lint 規則。
- **彈窗與 toast**：一律複用既有 `components/ui/ConfirmDialog`（覆蓋前確認、切換確認）與 `components/ui/Toast`（複製回饋），不自造。
- **文案集中**：全部進 `messages.teacher.restore.*`，中英雙語（`copyLink` / `warnTitle` / `warnBody` / `warnConfirm` / `linkCopied` / `copyFailed` / `linkInvalid` / `switchTitle` / `switchBody` / `switchConfirm` / `switchCancel` / `invalidTitle` / `invalidKeepBody` / `invalidContinue`）。

---

## 4. 程式碼落點（where）

| 檔案 | 角色 |
| --- | --- |
| `src/components/SettingsMenu.tsx` | 「複製我的還原連結」入口（US1）：sidebar variant + 有 `teacherId` 才顯示；點擊跳 `ConfirmDialog` 警告 → 確認才複製 + toast |
| `src/app/teacher/page.tsx` | 還原入口（US2/US3）：mount effect 讀 `?tid=` → 驗證 → 三分流（成功 / 不同 id 確認 / 無效）；`pendingSwitch`、`restoreFailed`、`invalidWithSession` 三個 state 與對應 render 分支；`confirmSwitch` / `cancelSwitch` / `dismissInvalidLink` handler |
| `src/app/api/teachers/[id]/route.ts` | 既有 `GET`（Drizzle `getDb`）—— 還原用它驗證 `tid` 存在並取 `name`（未新增端點） |
| `src/messages/zh-TW.ts`、`en.ts` | `teacher.restore.*` 中英文案 |

---

## 5. 驗證方式（已執行）

- **本機 dev server 逐情境實測**（皆通過）：US1 複製（連結格式 `/teacher?tid=` + toast）；US2 乾淨裝置還原 + 同 id no-op；US3 不同 id 確認（切換 / 維持）、無效連結有 session（不透明覆蓋、不清 localStorage、按鈕回原 dashboard）與無 session（建立帳號 + 內嵌提示）。
- **靜態檢查**：`eslint` + `tsc --noEmit` 於併入 D1 的樹上 0 error。
- **對照 Success Criteria**：SC-033 ~ SC-037 對應上述實測與程式碼搜尋（無 `app/teacher/restore` 路由）。

---

## 6. 文件影響（收尾以 `spec-align` skill 確認全部套用）

見 `spec.md`「文件影響」表。重點：`ui-spec.md` 可補「還原連結入口 / 與學生 QRCode 區隔 / 覆蓋層警示」段落；`data-model.md` 可對 `Teacher.email`「用於未來登入」補一句與本過渡機制的關係註記。schema 無變更。
