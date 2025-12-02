# Data Model: 小老師助手系統

**Branch**: `001-little-teacher-helper` | **Date**: 2024-12-02

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
                      │    Item     │              │
                      └─────────────┘              │
                            │                      │
                           N:M (透過 Submission)    │
                            │                      │
                      ┌─────────────┐              │
                      │ Submission  │──────────────┘
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

**驗證規則**:
- `name`: 非空，長度 1-50 字元
- `email`: 有效電子郵件格式（若提供）

---

### 2. Room (房間)

代表一個班級的登記空間。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| code | String | Unique, 6 chars | QRCode 用的短碼 (Base36) |
| name | String | Required, 1-100 chars | 班級名稱 |
| teacherId | String | FK → Teacher | 所屬老師 |
| isActive | Boolean | Default: true | 是否啟用 |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**: 
- 屬於一位老師 (N:1 → Teacher)
- 包含多位學生 (1:N → Student)
- 包含多個登記項目 (1:N → Item)

**驗證規則**:
- `name`: 非空，長度 1-100 字元
- `code`: 6 位英數字，自動產生，不重複

**狀態轉換**:
```
Active (isActive: true) ──[停用]──→ Inactive (isActive: false)
Inactive ──[重新啟用]──→ Active
```

---

### 3. Student (學生)

班級內的學生資料。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| name | String | Required, 1-50 chars | 學生姓名 |
| seatNumber | Int | Optional, 1-99 | 座號（選填） |
| roomId | String | FK → Room | 所屬房間 |
| isRemoved | Boolean | Default: false | 是否已移除 |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**: 
- 屬於一個房間 (N:1 → Room)
- 擁有多筆繳交記錄 (1:N → Submission)

**驗證規則**:
- `name`: 非空，長度 1-50 字元
- `seatNumber`: 若提供，需為 1-99 之間的整數
- 同一房間內，`name` + `seatNumber` 組合應唯一

**Soft Delete**: 使用 `isRemoved` 標記，保留歷史資料

---

### 4. Item (登記項目)

需要追蹤繳交狀況的項目。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| name | String | Required, 1-100 chars | 項目名稱 |
| roomId | String | FK → Room | 所屬房間 |
| dueDate | DateTime | Optional | 截止日期（選填） |
| isActive | Boolean | Default: true | 是否啟用 |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**: 
- 屬於一個房間 (N:1 → Room)
- 擁有多筆繳交記錄 (1:N → Submission)

**驗證規則**:
- `name`: 非空，長度 1-100 字元
- `dueDate`: 若提供，需為有效日期

---

### 5. Submission (繳交記錄)

學生對某項目的繳交狀態。

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | String | PK, UUID | 唯一識別碼 |
| studentId | String | FK → Student | 學生 |
| itemId | String | FK → Item | 登記項目 |
| status | Enum | Required | 狀態：SUBMITTED / NOT_SUBMITTED |
| updatedBy | String | Optional | 更新者標識（小老師裝置 ID） |
| syncedAt | DateTime | Optional | 同步時間（null 表示待同步） |
| createdAt | DateTime | Auto | 建立時間 |
| updatedAt | DateTime | Auto | 更新時間 |

**關聯**: 
- 屬於一位學生 (N:1 → Student)
- 屬於一個項目 (N:1 → Item)

**驗證規則**:
- `studentId` + `itemId` 組合必須唯一
- `status`: 僅接受 SUBMITTED 或 NOT_SUBMITTED

**狀態值**:
```typescript
enum SubmissionStatus {
  SUBMITTED = 'SUBMITTED',         // 已繳交
  NOT_SUBMITTED = 'NOT_SUBMITTED'  // 未繳交
}
```

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
  items     Item[]
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([teacherId])
  @@index([code])
}

model Student {
  id          String       @id @default(uuid())
  name        String
  seatNumber  Int?
  room        Room         @relation(fields: [roomId], references: [id])
  roomId      String
  submissions Submission[]
  isRemoved   Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([roomId, name, seatNumber])
  @@index([roomId])
}

model Item {
  id          String       @id @default(uuid())
  name        String
  room        Room         @relation(fields: [roomId], references: [id])
  roomId      String
  dueDate     DateTime?
  submissions Submission[]
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([roomId])
}

model Submission {
  id        String           @id @default(uuid())
  student   Student          @relation(fields: [studentId], references: [id])
  studentId String
  item      Item             @relation(fields: [itemId], references: [id])
  itemId    String
  status    SubmissionStatus @default(NOT_SUBMITTED)
  updatedBy String?
  syncedAt  DateTime?
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@unique([studentId, itemId])
  @@index([itemId])
  @@index([studentId])
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
      joinedAt: string;  // ISO timestamp
    };
  };
  
  // 學生名單快取
  students: {
    [roomId: string]: {
      id: string;
      name: string;
      seatNumber?: number;
    }[];
  };
  
  // 項目快取
  items: {
    [roomId: string]: {
      id: string;
      name: string;
      dueDate?: string;
    }[];
  };
  
  // 繳交狀態（本機狀態）
  submissions: {
    [itemId: string]: {
      [studentId: string]: {
        status: 'SUBMITTED' | 'NOT_SUBMITTED';
        updatedAt: string;  // ISO timestamp
        synced: boolean;
      };
    };
  };
  
  // 待同步的操作佇列
  syncQueue: {
    id: string;
    type: 'UPDATE_SUBMISSION';
    payload: {
      studentId: string;
      itemId: string;
      status: 'SUBMITTED' | 'NOT_SUBMITTED';
    };
    createdAt: string;
    retryCount: number;
  }[];
}
```

---

## Data Lifecycle

### 房間生命週期
```
建立 → 啟用中 → [停用] → 停用中 → [刪除] → 已刪除（保留記錄）
```

### 繳交記錄生命週期
```
初始化 (NOT_SUBMITTED) → [勾選] → SUBMITTED → [取消勾選] → NOT_SUBMITTED
                              ↓
                        [同步至伺服器]
                              ↓
                        synced: true
```

### 離線同步流程
```
1. 小老師操作 → 更新 localStorage
2. 加入 syncQueue
3. 偵測網路 → 有網路時
4. 依序處理 syncQueue
5. 成功 → 移出佇列，標記 synced
6. 失敗 → 增加 retryCount，下次重試
```

