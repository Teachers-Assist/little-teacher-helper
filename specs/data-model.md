# Data Model: 小老師助手系統

**Branch**: `001-little-teacher-helper` | **Date**: 2024-12-02 | **Updated**: 2026-07-28（ORM 改 Drizzle + Cloudflare D1，取代 Prisma／PostgreSQL；schema 真實來源移至 `src/db/schema.ts`）｜前次 2026-07-20（004 增量：新增 RecordHandler 子表；Task.dueDate 寫入慣例改 17:00）

本文件定義系統的資料模型，基於 Feature Spec 中的 Key Entities。

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Teacher   │──1:N──│    Room     │──1:N──│   Student   │
└─────────────┘       └─────────────┘       └─────────────┘
                            │                      │
                           1:N                     │
                            │                      │
                      ┌─────────────┐              │
                      │    Task     │              │
                      └─────────────┘              │
                            │                      │
                           1:N (透過 Record)        │
                            │                      │
                      ┌─────────────┐              │
                      │   Record    │──────────────┘
                      └─────────────┘
                            │
                           1:N
                            │
                      ┌───────────────┐
                      │ RecordHandler │  （004：順序處理者名單）
                      └───────────────┘
```

---

## Entities

### 1. Teacher (老師)

代表建立房間的使用者。MVP 階段採用簡化的身份驗證。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| name | String | Required, 1-50 chars | 老師姓名 |
| email | String | Unique, Optional | 電子郵件（可選，用於未來登入） |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**: 一位老師可擁有多個房間 (1:N → Room)

---

### 2. Room (房間)

代表一個班級的登記空間。一個 QRCode 對應一個房間，小老師掃碼後進入此房間選擇座號與任務。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| code | String | Unique, 6 chars | QRCode 用的短碼 (Base36) |
| name | String | Required, 1-100 chars | 班級名稱 |
| teacherId | String | FK → Teacher | 所屬老師 |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**:
- 屬於一位老師 (N:1 → Teacher)
- 包含多位學生 (1:N → Student)
- 包含多個任務 (1:N → Task)

> **房間沒有「啟用 / 停用」狀態**：原 `isActive` 欄位與 Active/Inactive lifecycle 已於 2026-06-28 移除。老師實務上的「關閉」需求由**任務層級**（`status=CLOSED` + `isArchived`）涵蓋；沒有任何 feature 定義「老師停用整個班級」的入口，故移除此孤兒欄位（含 join 流程的 isActive 檢查）。

---

### 3. Student (學生)

班級內的學生資料。座號是小老師進入系統時的身份選擇依據，建議必填。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| name | String | Required, 1-50 chars | 學生姓名 |
| seatNumber | Int | Required, 1-99 | 座號（身份識別依據，強烈建議不留空） |
| roomId | String | FK → Room | 所屬房間 |
| isRemoved | Boolean | Default: false | 是否已移除（soft delete） |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**:
- 屬於一個房間 (N:1 → Room)
- 擁有多筆登記記錄 (1:N → Record)

**驗證規則**:
- 同一房間內，`seatNumber` 唯一
- `name` 非空，長度 1-50 字元

**Soft Delete**: 使用 `isRemoved` 標記，保留歷史記錄

---

### 4. Task (任務)

老師在房間內建立的登記工作。一個任務對應一種需要追蹤的事項，類型決定登記介面與資料格式。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| name | String | Required, 1-100 chars | 任務名稱（例：「數學作業」、「校外教學同意書」） |
| type | Enum | Required | 任務類型：SUBMISSION（繳交與否）/ GRADE（成績數值） |
| roomId | String | FK → Room | 所屬房間 |
| assignedSeatNumber | Int | Optional | 指定負責登記的小老師座號（可為空，可後來再指定） |
| dueDate | DateTime | Optional | 截止時間（到期後自動鎖定，老師可手動解除）。**寫入慣例（004）**：老師只選日期，系統補時間為當天 **17:00**（放學）；取代 001 的 `23:59:59`。同影響「延長截止」。既有 23:59:59 舊資料不 migration |
| status | Enum | Default: ACTIVE | 任務狀態（見下方說明） |
| isArchived | Boolean | Default: false | 是否已封存（soft archive，002 引入；封存後主清單不顯示，但歷史登記記錄保留；與 status 欄位獨立） |
| archivedAt | DateTime | Optional | 最近一次封存時間（004 FR-097a）；封存時設為 now、還原時清為 null。用於辨識「封存後才同步進來」的登記 |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**:
- 屬於一個房間 (N:1 → Room)
- 擁有多筆登記記錄 (1:N → Record)

**Soft Archive**: 使用 `isArchived` 標記（002 feature 引入）。`isArchived` 與 `status` 互相獨立 —— 例：一個 `status = ACTIVE` 且 `isArchived = true` 的任務代表「老師暫時封存了一個進行中的任務」，可隨時還原（`isArchived = false`）。

**任務狀態**:
```typescript
enum TaskStatus {
  ACTIVE = 'ACTIVE',                     // 開放登記中
  HELPER_COMPLETED = 'HELPER_COMPLETED', // 小老師已標記完成，鎖定中
  CLOSED = 'CLOSED'                      // 老師已結案
}
```

**狀態轉換**:
```
ACTIVE ──[小老師標記完成]──→ HELPER_COMPLETED ──[老師重新開放]──→ ACTIVE
ACTIVE ──[截止時間到]──→ 鎖定（status 仍 ACTIVE，但 dueDate 已過）
ACTIVE / HELPER_COMPLETED ──[老師結案]──→ CLOSED
```

**鎖定條件**（小老師無法修改記錄）:
- `status` 為 `HELPER_COMPLETED` 或 `CLOSED`
- 或 `dueDate` 已過（即使 status 仍為 ACTIVE）

---

### 5. Record (登記記錄)

學生對某任務的登記結果，以及是誰登記的。

> **核心原則：一筆 Record 代表「已登記」。** 系統不為未登記的學生預建空白記錄，
> 也不儲存「未繳交 / 空成績」這類空值狀態——「未繳交」是畫面從「查無記錄」推導的。
> 因此繳交類型只會存在 `submissionStatus = SUBMITTED` 的記錄；小老師取消勾選，
> 或把成績清空，等同於**刪除該筆 Record**，使其回到「沒登記過」。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| taskId | String | FK → Task | 所屬任務 |
| studentId | String | FK → Student | 被登記的學生 |
| submissionStatus | Enum | Optional | 繳交狀態（SUBMISSION 類型；實際只會是 SUBMITTED） |
| gradeValue | Int | Optional, 0-100 | 成績數值（GRADE 類型任務使用） |
| recorderSeatNumber | Int | Required | 實際操作登記的小老師座號（**最後一手**；每次 upsert 覆寫。等於 RecordHandler 名單最後一筆的座號） |
| isAssignedRecorder | Boolean | Required | 此次登記者是否為任務指定的小老師（跟隨 recorderSeatNumber，即「最後一手」的身份） |
| syncedAt | DateTime | Optional | 同步至伺服器的時間（null 表示待同步） |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**:
- 屬於一個任務 (N:1 → Task)
- 屬於一位學生 (N:1 → Student)

**驗證規則**:
- `taskId` + `studentId` 組合唯一（一個學生對一個任務最多一筆記錄）
- SUBMISSION 類型：儲存的 `submissionStatus` 恆為 `SUBMITTED`，`gradeValue` 為 null
- GRADE 類型：`gradeValue` 為 0-100 整數，`submissionStatus` 為 null
- 記錄只在「有登記」時存在；下列操作會刪除記錄而非寫入空值：
  - SUBMISSION：登記輸入為 `NOT_SUBMITTED`（取消勾選）
  - GRADE：登記輸入清空（空字串 / null）

**繳交狀態值**:
```typescript
enum SubmissionStatus {
  SUBMITTED = 'SUBMITTED',         // 已繳交（唯一會被儲存的狀態）
  NOT_SUBMITTED = 'NOT_SUBMITTED'  // 未繳交：作為「取消登記」的輸入意圖，不會被儲存
}
```

> 統計時「未繳交人數」以 `班級在籍學生總數 − 已繳交記錄數` 推導，不依賴 NOT_SUBMITTED 記錄。
> 統計與異常判定的分子分母 MUST 排除 `isRemoved` 學生（004 FR-104）：分母只算在籍、分子不計已移除學生的記錄。移除為軟刪除，records 實體保留、可還原。

---

### 6. RecordHandler (登記處理者，004 引入)

一筆 Record 的**順序處理者名單**：每一次處理（建立或修改）追加一筆，依時間排序，構成完整經手鏈。目的是「監視器」證據 —— 老師起疑時可查「這筆被哪些座號、依什麼順序、在什麼時間處理過」（004 US4）。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| recordId | String | FK → Record | 所屬登記記錄 |
| seatNumber | Int | Required | 該次處理者座號 |
| handledAt | DateTime | Required | 該次處理時間（名單排序依據） |

**關聯**: 屬於一筆 Record (N:1 → Record)

**語意**:
- 名單**第一筆**＝最初建立者；**最後一筆**＝最後修改者（＝ `Record.recorderSeatNumber`）
- 因此不需要另立「最初建立者座號」「最後修改者座號」純量欄位 —— 由名單首尾推導
- **只留人與順序，不留前值**：查得到誰、何時、第幾手，查不到每一手改成什麼（升級為完整 audit log 仍待決，見 `open-questions.md` 2026-07-20）

**寫入規則**:
- 同一座號**連續**修改自己剛登的紀錄 MUST NOT 追加相鄰重複項（避免正常修正灌爆名單）；被其他座號穿插後的同座號再次修改仍各自記錄（`8 → 12 → 8` 與 `8 → 8 → 8` 意義不同）
- 離線期間的處理 MUST 隨同步一併送出，並依 `handledAt` 正確順序併入名單

---

## Drizzle Schema

> **2026-07-28 起，ORM 為 Drizzle（取代 Prisma）。** Schema 的**單一真實來源是
> `src/db/schema.ts`**；本節僅說明對映與相容性重點。線上資料庫為 **Cloudflare D1**
> （SQLite 相容），本機開發用 **libsql** 讀本機 SQLite 檔（根目錄 `local.db`）。
> 生產環境不再是 PostgreSQL。

上表 6 個實體與 3 個 enum（TaskType / TaskStatus / SubmissionStatus）皆維持不變，只是改由
`drizzle-orm/sqlite-core` 定義（`sqliteTable`）。表名維持 PascalCase、欄名維持 camelCase，
與既有資料庫完全一致。enum 於 SQLite 以 `text` 欄位儲存、TS 層以 `src/types` 的 enum 約束。

**儲存相容性（關鍵，勿更動——由實際 `dev.db` 驗證）**：舊資料由 Prisma 寫入，Drizzle 必須沿用
相同的物理儲存慣例才能正確讀回：

| 概念型別 | SQLite 實際儲存 | Drizzle 定義 |
|---|---|---|
| DateTime（createdAt / updatedAt / dueDate / archivedAt / syncedAt / handledAt） | **INTEGER 毫秒**（Unix ms） | `integer(col, { mode: 'timestamp_ms' })` |
| Boolean（isRemoved / isArchived / isAssignedRecorder） | **INTEGER 0 / 1** | `integer(col, { mode: 'boolean' })` |
| id（PK） | TEXT UUID | `text(col).primaryKey().$defaultFn(() => crypto.randomUUID())` |

- 時間戳**不依賴** SQL 的 `DEFAULT CURRENT_TIMESTAMP`（那會寫入 TEXT）；一律由
  `$defaultFn` / `$onUpdateFn` 在應用層寫入 `Date`，維持毫秒整數形式。
- 唯一約束（`Record` 的 `(taskId, studentId)`、`Student` 的 `(roomId, seatNumber)`）以
  `uniqueIndex` 定義，供 `onConflictDoUpdate` upsert 使用。
- 關聯（`relations()`）供 `db.query.X.findFirst/findMany({ with })` 使用，取代 Prisma 的
  `include`；關聯欄位排序 relational API 不支援，需於記憶體排序。

**遷移 / 建表**：初始建表 SQL 為 `migrations/0001_init.sql`（D1 與 SQLite 相容，schema 未變）。
本機用 `pnpm db:push` 依 schema 同步，線上用 `pnpm db:migrate:remote`（wrangler）套用 migrations。

---

## Offline Data Structure

小老師端本機儲存的資料結構：

```typescript
// localStorage key: 'little-helper-offline-data'

interface OfflineData {
  // 已加入的房間資訊
  rooms: {
    [roomId: string]: {
      id: string;
      code: string;
      name: string;
      joinedAt: string;       // ISO timestamp
      seatNumber: number;     // 本次選擇的座號
    };
  };

  // 學生名單快取
  students: {
    [roomId: string]: {
      id: string;
      name: string;
      seatNumber: number;
    }[];
  };

  // 任務快取（小老師端僅快取 isArchived=false 的任務；封存任務不會推到本機）
  tasks: {
    [roomId: string]: {
      id: string;
      name: string;
      type: 'SUBMISSION' | 'GRADE';
      assignedSeatNumber?: number;
      dueDate?: string;
      status: 'ACTIVE' | 'HELPER_COMPLETED' | 'CLOSED';
    }[];
  };

  // 登記記錄（本機狀態）
  records: {
    [taskId: string]: {
      [studentId: string]: {
        submissionStatus?: 'SUBMITTED' | 'NOT_SUBMITTED';
        gradeValue?: number;
        recorderSeatNumber: number;
        isAssignedRecorder: boolean;
        updatedAt: string;    // ISO timestamp
        // 「是否已同步」不存於此——改由「該 (taskId, studentId) 是否還在 syncQueue」派生
        // （overlay 模型；004 S3 移除原 synced 欄位）
      };
    };
  };

  // 待同步的操作佇列
  syncQueue: {
    id: string;
    type: 'UPDATE_RECORD';
    payload: {
      taskId: string;
      studentId: string;
      submissionStatus?: 'SUBMITTED' | 'NOT_SUBMITTED';
      gradeValue?: number;
      recorderSeatNumber: number;
      // isAssignedRecorder 不在 payload——由 server 依 recorderSeatNumber 派生
      // （computeIsAssignedRecorder）；handledAt 用 op 的 timestamp 送出（FR-097）
    };
    createdAt: string;
    retryCount: number;
    rev: number;          // 樂觀並行控制版本戳（004 S9）：新建=0，去重換 payload 時 +1
    nonRetryable?: boolean; // 不可重試標記（004 S10）；session 範圍、載入時重置，不視為持久判定
  }[];
}
```

> **004 交錯的同步正確性修正（`specs/offline-sync-remediation.md`）**：
> - **Overlay 模型（S1–S3 已落地）**：畫面為 `records`（base，伺服器鏡像）⊕ `syncQueue`（overlay，未同步變更集）的**派生**值，兩層各一個寫入者。原 `records[].synced` 欄位**已移除**（S3），未同步狀態改由「該筆是否還在佇列」派生。`queueRecordUpdate` 不再寫 `records` 快取。
> - **版本戳（rev 欄位 S9 已加；條件式 ack S10 待落地）**：`syncQueue[]` 已有 `rev: number`（樂觀並行控制）。S10 將於 `processSyncQueue` 送出前記 `sentRev`、回應到達時只 ack `rev` 未變者，避免飛行期間被改的新值被舊回應誤 ack 而蒸發。`/api/sync` 無需改動（`rev` 為純 client 端）。
> - **離線經手鏈（S29，待落地）**：`syncQueue[].payload` 送出時一併帶 `handledAt`，供 server 併入 `RecordHandler` 名單（004 FR-097）。
>
> 上述屬 remediation 交錯項，尚未實作；本結構待 004 對應 task（T301/T313/T350）落地後同步更新為最終樣貌。未送出的佇列資料在任何情況下都持久保留（NFR-013）。

---

## Data Lifecycle

### 任務生命週期
```
建立 (ACTIVE, isArchived=false)
  │
  ├──[小老師標記完成]──→ HELPER_COMPLETED（鎖定）
  │                            │
  │                     [老師重新開放]──→ ACTIVE
  │
  ├──[截止時間到]──→ 鎖定（status 仍 ACTIVE，dueDate 已過；老師端徽章顯示「已截止」）
  │
  ├──[老師結案]──→ CLOSED
  │                            │
  │                     [老師重新開放]──→ ACTIVE（若 dueDate 過往則先要求重設）
  │
  └──[老師封存]──→ isArchived=true（與 status 獨立；主清單不顯示）
                              │
                       [老師還原]──→ isArchived=false
```

**封存與 status 的關係**（002 引入）：
- `isArchived` 是 soft archive flag，與 status 流轉**完全獨立**
- 任意 status（ACTIVE / HELPER_COMPLETED / CLOSED）的任務都可以被封存
- 封存後該任務不在主任務清單顯示、不在班級狀況 tab 列入統計，但歷史 Record 保留
- 還原（unarchive）後恢復原 status，可繼續操作

### 登記記錄生命週期
```
初始：無記錄（＝未登記 / 未繳交）
  │
  [小老師登記] → 建立 Record（本機儲存，synced: false）
  │
  [網路同步] → syncedAt 填入，synced: true
  │
  [修改] → 更新 Record（任務未鎖定時）
  │
  [取消勾選 / 清空成績] → 刪除 Record，回到「無記錄」（任務未鎖定時）
```

### 離線同步流程
```
1. 小老師操作 → 更新 localStorage records
2. 加入 syncQueue
3. 偵測網路恢復
4. 依序處理 syncQueue
5. 成功 → 移出佇列，標記 synced: true，填入 syncedAt
6. 失敗 → retryCount++，session 內重試（上限屬調參）
```

> **004 修正**：`retryCount` 與「不可重試」標記為 session 範圍，**每次頁面載入時重置並重試一次**；未送出的佇列資料一律持久保留、永不靜默丟棄。因此 session 內「放棄」不等於資料死亡（老師重新開放任務後，學生重整即自動重送）。詳見 `specs/004-alerts-and-feedback/spec.md` US1 / FR-079。

**換座號（clearRoom）對離線資料的影響**（003 US4 引入）：
小老師換座號（`clearRoom(roomId)`）時，只清掉 `rooms` / `students` / `tasks` 三類本機快取讓使用者重新從 `/join` 入場；**`records` 與 `syncQueue` 刻意保留**。理由：未同步的登記是不可逆資料，不可因換座號而遺失（守 vision「不可逆操作不破壞資料」）。未送出的登記仍掛在佇列裡、連線後照常上傳，並保留原 `recorderSeatNumber`（問責不丟）。同一台裝置換座號後可繼續累積登記；對同一 `taskId + studentId` 再次登記則沿用既有去重邏輯更新該筆。

> **（2026-08-05）換座號改為線上限定**：helper 端點「登記者：」badge 換座號時以 `isOnline` 判斷，**離線一律擋下**（不 `clearRoom`、不導 `/join`，只顯示提示）。原因與上一段的去重邏輯直接相關：`syncQueue` 去重鍵是 `taskId + studentId`（**不含座號**），命中即整包覆寫 payload。若允許離線換座號，共用裝置上「前一座號尚未同步的登記」會被「換座號後同一 (task, student) 的登記」原地吃掉，該手永不進資料庫、也不進順序處理者名單（多人經手，004 FR-092/097）。線上限定讓連線先排空佇列、每手各自成 op，藉此保住經手鏈正確性。詳見 `open-questions.md` 2026-08-05。
