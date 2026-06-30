# Data Model: 小老師助手系統

**Branch**: `001-little-teacher-helper` | **Date**: 2024-12-02 | **Updated**: 2026-06-25（002 增量：Task.isArchived）

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
| dueDate | DateTime | Optional | 截止時間（到期後自動鎖定，老師可手動解除） |
| status | Enum | Default: ACTIVE | 任務狀態（見下方說明） |
| isArchived | Boolean | Default: false | 是否已封存（soft archive，002 引入；封存後主清單不顯示，但歷史登記記錄保留；與 status 欄位獨立） |
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
| recorderSeatNumber | Int | Required | 實際操作登記的小老師座號 |
| isAssignedRecorder | Boolean | Required | 此次登記者是否為任務指定的小老師 |
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

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // MVP: sqlite, Production: postgresql
  url      = env("DATABASE_URL")
}

model Teacher {
  id        String   @id @default(uuid())
  name      String
  email     String?  @unique
  rooms     Room[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Room {
  id        String    @id @default(uuid())
  code      String    @unique
  name      String
  teacher   Teacher   @relation(fields: [teacherId], references: [id])
  teacherId String
  students  Student[]
  tasks     Task[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([teacherId])
  @@index([code])
}

model Student {
  id          String   @id @default(uuid())
  name        String
  seatNumber  Int
  room        Room     @relation(fields: [roomId], references: [id])
  roomId      String
  records     Record[]
  isRemoved   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([roomId, seatNumber])
  @@index([roomId])
}

model Task {
  id                  String     @id @default(uuid())
  name                String
  type                TaskType
  room                Room       @relation(fields: [roomId], references: [id])
  roomId              String
  assignedSeatNumber  Int?
  dueDate             DateTime?
  status              TaskStatus @default(ACTIVE)
  isArchived          Boolean    @default(false)
  records             Record[]
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  @@index([roomId])
  @@index([isArchived])
}

model Record {
  id                   String            @id @default(uuid())
  task                 Task              @relation(fields: [taskId], references: [id])
  taskId               String
  student              Student           @relation(fields: [studentId], references: [id])
  studentId            String
  submissionStatus     SubmissionStatus?
  gradeValue           Int?
  recorderSeatNumber   Int
  isAssignedRecorder   Boolean
  syncedAt             DateTime?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  @@unique([taskId, studentId])
  @@index([taskId])
  @@index([studentId])
}

enum TaskType {
  SUBMISSION  // 繳交與否
  GRADE       // 成績數值
}

enum TaskStatus {
  ACTIVE
  HELPER_COMPLETED
  CLOSED
}

enum SubmissionStatus {
  SUBMITTED
  NOT_SUBMITTED
}
```

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
        synced: boolean;
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
      isAssignedRecorder: boolean;
    };
    createdAt: string;
    retryCount: number;
  }[];
}
```

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
6. 失敗 → retryCount++，下次重試（最多 3 次）
```

**換座號（clearRoom）對離線資料的影響**（003 US4 引入）：
小老師換座號（`clearRoom(roomId)`）時，只清掉 `rooms` / `students` / `tasks` 三類本機快取讓使用者重新從 `/join` 入場；**`records` 與 `syncQueue` 刻意保留**。理由：未同步的登記是不可逆資料，不可因換座號而遺失（守 vision「不可逆操作不破壞資料」）。未送出的登記仍掛在佇列裡、連線後照常上傳，並保留原 `recorderSeatNumber`（問責不丟）。同一台裝置換座號後可繼續累積登記；對同一 `taskId + studentId` 再次登記則沿用既有去重邏輯更新該筆。
