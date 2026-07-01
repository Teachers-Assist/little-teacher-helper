---
name: spec-align
description: >
  Use this skill when the user adds or modifies a feature spec under
  `specs/00X-*/spec.md` and wants to validate the new feature and align
  dependent docs. Trigger on phrases like "對齊規格", "對齊 spec",
  "align spec", "新 feature 檢查", "spec 改了要更新", "新增功能後檢查",
  or whenever the user just finished editing a feature's spec.md and asks
  for review/sync. The skill (1) cross-checks the new feature against older
  features for conflict or duplication, (2) verifies the new feature aligns
  with `specs/vision.md`, (3) verifies UI design choices in the new feature
  do not violate `specs/ui-spec.md`, (4) cross-checks entity/field usage
  against the project-wide `specs/data-model.md` and proposes incremental
  updates to it, (5) lists missing i18n keys in `src/messages/zh-TW.ts`
  & `en.ts` and drafts bilingual copy (student-facing copy must use
  child-friendly tone per vision.md), and (6) propagates the spec changes
  to the same feature folder's `plan.md` if it exists. This skill is
  project-local to little-teacher-helper.
---

# Spec Alignment（小老師助手專案專用）

當使用者在 `specs/00X-*/spec.md` 新增或修改 feature 後要求「對齊規格」時，這個 skill 負責兩件事：

1. **驗證新 feature 沒有矛盾或缺漏** —— 對照舊 features、vision.md、ui-spec.md、data-model.md、i18n。
2. **把 spec 改動傳播到**（a）同 feature 資料夾內的 plan.md（若存在），以及（b）全專案共用的 `specs/data-model.md`。

不會碰 `vision.md`、`ui-spec.md`、`quickstart.md`、`open-questions.md`、`spec.md` 本身——這些是上游或獨立維護的文件。

---

## 專案文件結構（執行前先記住）

```
specs/
├── 00X-<feature-slug>/      ← 每個 feature 一個資料夾
│   ├── spec.md              ← 需求規格（這個 skill 對齊的來源）
│   ├── plan.md              ← (可選) 該 feature 的技術計畫
│   ├── tasks.md             ← 任務拆解
│   └── ...
├── vision.md                ← 產品願景（上游，不改）
├── ui-spec.md               ← UI 設計規範（上游，不改）
├── data-model.md            ← 跨 feature 共用的資料模型（單一事實來源，這個 skill 會增量更新）
├── quickstart.md            ← 開發指南（上游，不改）
└── open-questions.md        ← 獨立維護
```

i18n 文案集中在 `src/messages/zh-TW.ts` 與 `src/messages/en.ts`，由 `src/messages/index.ts` 匯出。所有 UI 文字必須走這裡（NFR-001）。

---

## Step 1: 找出「新 feature」是哪一個

依以下順序判定，前一步成功就停：

1. **對話 context** — 使用者剛剛在這次對話中修改/新增的 spec.md 是哪一份？
2. **git status** — 跑 `git status --short specs/` 看哪個 `00X-*/spec.md` 處於 modified / added。
3. **編號最大的資料夾** — 排序 `specs/` 下所有 `^[0-9]{3}-` 開頭的資料夾，取編號最大者。
4. **問使用者** — 以上都不確定時直接問：「請問你要對齊的是哪個 feature？」

確定後，將「新 feature」記為 `<NEW>`（路徑：`specs/<NEW>/`），其餘 `00X-*` 視為「舊 features」。

---

## Step 2: 讀進需要的文件

只讀 Step 3、4 會用到的：

- `specs/<NEW>/spec.md`（必讀）
- `specs/vision.md`
- `specs/ui-spec.md`
- `specs/data-model.md`（必讀，全專案共用）
- 其他 `specs/00X-*/spec.md`（每個都讀，要做交叉比對）
- `src/messages/zh-TW.ts`、`src/messages/en.ts`
- 如果 `specs/<NEW>/plan.md` 存在：讀

---

## Step 3: 五項驗證

### 3.1 與舊 feature 的衝突／重複檢查

逐一比對 `<NEW>` 與每個舊 feature 的 spec.md，找出：

- **路由衝突**：新 feature 是否定義了與舊 feature 相同的路由路徑（例如兩邊都用 `/teacher/rooms/[id]/students`）但語意不同？
- **User Story 重複**：新 feature 的 story 是否實際上是舊 feature 已涵蓋的需求重寫？
- **互斥行為**：新 feature 的設計是否要求改變舊 feature 已實作的流程，但舊 feature 的 spec 沒被同步修改？

（**Entity 衝突檢查移到 3.4，因為 data-model.md 已是全專案共用。**）

把每一個發現整理成：「**位置**（檔案+行/段落）→ **衝突點** → **建議**（合併、改名、覆蓋舊 spec、或標註依賴）」。

### 3.2 與 vision.md 的對照

對新 feature 的每一個 user story / FR / 設計決策，問：

- 是否違反 vision.md 中**任何明文寫下的設計哲學**？特別注意：
  - 「以可逆性決定保護強度」—— 不可逆操作必須硬擋；可逆操作要有還原機制。
  - 「使用者是兒童」—— 學生端的設計是否假設了成人才有的耐受度或判斷力？
  - 「把管理工作還給學生」—— 新功能是否反而把工作堆回老師身上？
  - 「老師做最少操作」—— 新增的老師端流程步驟是否過多？
  - 「鷹架不是黑盒」—— 系統的判斷/錯誤是否對使用者透明？
- 是否在 vision.md 提到的情境中**有遺漏的場景**沒處理（例如：vision 提到離線優先，但新 feature 沒說離線時怎麼運作）？

每一項衝突或不足以「**vision.md 哪一段** → **新 feature 哪一段** → **問題** → **建議**」格式回報。

### 3.3 與 ui-spec.md 的對照

掃描新 feature spec 中所有提到 UI 元素、視覺、互動的段落，比對 ui-spec.md：

- 顏色：是否提到禁用的 `violet/indigo/yellow` 等原始 Tailwind class？應使用 `primary-*` / `accent-*` token。
- 元件：按鈕、卡片、輸入框、徽章是否提到手刻樣式而沒用 `.btn` / `.card` / `.input` / `.badge` 等語意 class？
- 佈局：是否在 `/teacher/*` 以外的路由用了 `.page-header` / `.page-body`，或反過來？
- 圖示：是否提到直接 import `@iconify/react` 而非透過 `<Icon>` 元件？
- 陰影：是否要求 `shadow-*` Tailwind utility？陰影應由 component layer 處理。

如果新 feature 沒提到 UI 細節（純需求描述），這節可以記「無 UI 細節衝突」並跳過。

### 3.4 與 data-model.md 的對照（核心檢查）

`specs/data-model.md` 是全專案共用的單一事實來源。新 feature 對 entity / field / relation 的所有引用都要對照它檢查：

逐項掃描新 feature spec：

1. **新 feature 提到的每個 entity**：
   - 該 entity 在 `data-model.md` 是否已存在？
   - 不存在 → 標記為「新 entity 待新增」（Step 4.2 處理）
   - 存在 → 繼續檢查欄位
2. **新 feature 提到的每個 entity 欄位**：
   - 該欄位在 `data-model.md` 的 entity 表格與 Prisma schema 都存在嗎？
   - 不存在 → 標記為「新欄位待新增」
   - 存在但型別/語意不一致 → **衝突警告**，列出兩邊定義，請使用者裁決
3. **新 feature 提到的關聯（relation）**：
   - 兩端 entity 都存在嗎？關聯方向、cardinality（1:1 / 1:N / N:N）跟 data-model.md 一致嗎？
   - 不一致 → 警告
4. **未明說但隱含的 entity 假設**：
   - 例如 spec 寫「老師可以匯出班級成績」但 data-model.md 沒有 ClassResult 或對應的彙整 entity → 標記為「實作需要的 entity 缺漏」
5. **新 feature 對既有 entity 狀態流的改動**：
   - 例如 spec 寫「新增封存任務」對應到 Task 多了 `isArchived` 欄位且 lifecycle 多了狀態 → 標記，由 Step 4.2 處理

把每個發現整理成：「**entity / 欄位 / 關聯名稱** → **新 feature 中的引用位置** → **data-model.md 中的現況** → **衝突/缺漏類型** → **建議動作**」。

### 3.5 i18n 文案缺漏檢查與草擬

從新 feature spec 中萃取**所有面向使用者顯示的文字**——按鈕、標題、提示、錯誤訊息、空狀態文案、成功訊息等。

對每一筆：

1. 在 `src/messages/zh-TW.ts` 找對應 key。沿用既有命名慣例（例：`common.cancel`、`app.name`）。
2. 找不到的列入「缺漏清單」，並**同時草擬 zh-TW 和 en**。
3. **語氣判斷**：
   - 如果這段文字會顯示在 **學生端**（`/helper/*`、`/join/*` 路由相關），語氣要符合 vision.md 描述：**小孩口吻，避免成人化措辭**。例：避免「請確認您的操作」，改用「確定要這樣做嗎？」。
   - 老師端（`/teacher/*`）維持中性、簡潔、專業但不冷漠。
4. 提案的 key 用點記法分群（`student.*`、`teacher.*`、`tasks.*` 等），參考既有結構。

輸出範例：

```
缺漏 key 清單：
- tasks.batchImport.button
  zh-TW: '批次匯入學生'
  en:    'Batch import students'
  位置：002 spec User Story 1
  端別：老師端（中性語氣）

- helper.tasksDone.celebration
  zh-TW: '太棒了！今天的任務都完成囉 🎉'
  en:    'Awesome! All done for today 🎉'
  位置：00X spec User Story 3
  端別：學生端（小孩口吻）
```

---

## Step 4: 傳播 spec 改動到 plan.md 和 data-model.md

### 4.1 更新 `specs/<NEW>/plan.md`（如果存在）

**只有當 `specs/<NEW>/plan.md` 存在時才做。** 若該 feature 還沒進到設計階段，跳過。

只動真的被影響的段落：

- **Summary**：當核心流程或範圍變動時才重寫。
- **Constitution Check**：MVP-First 範圍改變時更新；其他列維持，除非有直接矛盾。
- **Source Code 結構**：
  - 路由路徑（`app/[entity]/`、`app/api/[entity]/`）跟 entity 同步。
  - Component 命名反映目前的資料模型與使用者流程。
  - Entity 重新命名時，把所有出現處（路由、API 路徑、component、註解）一起改。
- **Constraints**：新增的 NFR 對應限制條件加在這裡，一條一行。

### 4.2 增量更新 `specs/data-model.md`（核心更新點）

依 Step 3.4 列出的差異清單，**增量**修改 `data-model.md`。注意：這是全專案共用文件，**不要整份重寫，只動有變的部分**。

這份文件內部一致性要求高，動一處通常要連動數處。

**新增 entity**：
- 在 ERD 圖適當位置加入新方塊與關聯線
- 依現有 entity 的格式新增一節（章節標題、表格、關聯說明）
- 補 Prisma schema model
- 若離線需快取，加入 Offline Data Structure
- 若有有意義的狀態轉移，補 Data Lifecycle 區塊

**Entity 重新命名（例 `Item → Task`）**：
- ERD 圖：方塊與所有箭頭標籤一起改
- Entity section 標題與表格
- 所有「關聯」段落中提到舊名的地方
- Prisma schema：`model` 名稱、relation field、`@relation` 參照
- Offline Data Structure：TypeScript interface 的 key
- Data Lifecycle：所有狀態標籤中引用舊名的地方

**欄位新增/變動**：
- entity 表格加入欄位（含型別、constraint、描述）
- Prisma schema 對應 model 加欄位
- 若是離線需要的欄位，同步 Offline Data Structure interface
- 若有 constraint，更新 validation 規則段落

**改完之後做內部一致性檢查**：
- ERD 每個 entity 都有對應 entity section
- entity 表格的每個欄位都在 Prisma schema 出現
- Offline Data Structure 的 key 用的是目前的 entity 名

**重要**：因為 data-model.md 是全專案共用，更新時要注意舊 feature 已實作的 entity 不要被破壞。任何 breaking change（重新命名、刪除欄位、改變關聯）都要在報告中**明確標示為 breaking**，並提醒使用者該 entity 對應的舊 feature 程式碼也需要同步調整。

---

## Step 5: 跨檔案一致性掃描

最後快速 cross-check：

- `specs/data-model.md` 中的 entity 名稱與 `specs/<NEW>/plan.md` 的路由路徑、component 命名一致
- Prisma model 名稱與其上方 entity 表格名稱一致
- Offline Data Structure interface 的 key 是現行 entity 名
- spec 中新增的 user story 在 `plan.md` 有對應的路由 / component 條目
- spec 中強制慣例的 NFR 在 `plan.md` Constraints 有對應條目
- 舊 features 的 spec.md 對 entity 的引用是否仍然有效（沒有因為這次 data-model 變動而失效）

---

## 報告輸出格式

最後給使用者一份統整報告：

```
## 1. 與舊 feature 的衝突／重複
（無 → 寫「無發現」）

## 2. 與 vision.md 的對照
（無 → 寫「符合 vision」）

## 3. 與 ui-spec.md 的對照
（無 UI 細節 → 寫「新 feature 無 UI 設計細節，跳過」）

## 4. 與 data-model.md 的對照
- 新 entity 待新增：...
- 新欄位待新增：...
- 衝突警告（型別/語意不一致）：...
- 隱含但未明說的 entity 假設：...
- Breaking change（會影響舊 feature）：...

## 5. i18n 缺漏清單（含 zh-TW / en 草擬）

## 6. 文件更新摘要
- `specs/<NEW>/plan.md`：更新了哪些段落（或：跳過，feature 尚未進入設計階段）
- `specs/data-model.md`：增量更新了哪些 entity / 欄位 / 關聯
```

每個發現都要附**檔案路徑 + 行號或段落定位**，方便使用者跳過去確認。

---

## 不要做的事

- 不要動 `specs/vision.md`、`specs/ui-spec.md`、`specs/quickstart.md`、`specs/open-questions.md`
- 不要動 `specs/<NEW>/spec.md` 本身（你是對齊到 spec，不是改 spec）
- 不要動其他 feature 的 plan.md（每個 feature 自己管自己的 plan）
- 不要整份重寫 `specs/data-model.md`——只做增量修改
- 不要直接寫進 `src/messages/zh-TW.ts` / `en.ts`——i18n 改動由使用者審核後再加（這個 skill 只草擬不落地）
