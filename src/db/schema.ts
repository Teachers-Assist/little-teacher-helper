// Drizzle schema —— 精確對映現有 SQLite / D1 資料表（原 Prisma 產生）。
//
// 關鍵相容性（由實際 dev.db 驗證，勿更動）：
//  - 所有時間欄位以 INTEGER 毫秒儲存（Prisma 的 DateTime 慣例）→ mode: 'timestamp_ms'，
//    讀寫皆為 JS Date。MUST NOT 依賴 SQL 的 DEFAULT CURRENT_TIMESTAMP（那會寫入 TEXT），
//    一律由 $defaultFn / $onUpdateFn 在應用層寫 Date，維持毫秒整數形式。
//  - Boolean 以 INTEGER 0/1 儲存 → mode: 'boolean'。
//  - 主鍵 id 為 TEXT uuid，由應用層產生（crypto.randomUUID，Node 與 Workers 皆有）。
//  - 表名維持 PascalCase、欄名維持 camelCase，與既有資料庫完全一致。

import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const uuid = () => crypto.randomUUID();
const createdAt = () =>
  integer('createdAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = () =>
  integer('updatedAt', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

export const teacher = sqliteTable('Teacher', {
  id: text('id').primaryKey().$defaultFn(uuid),
  name: text('name').notNull(),
  email: text('email').unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const room = sqliteTable(
  'Room',
  {
    id: text('id').primaryKey().$defaultFn(uuid),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    teacherId: text('teacherId')
      .notNull()
      .references(() => teacher.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('Room_teacherId_idx').on(t.teacherId), index('Room_code_idx').on(t.code)]
);

export const student = sqliteTable(
  'Student',
  {
    id: text('id').primaryKey().$defaultFn(uuid),
    name: text('name').notNull(),
    seatNumber: integer('seatNumber').notNull(),
    roomId: text('roomId')
      .notNull()
      .references(() => room.id),
    isRemoved: integer('isRemoved', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('Student_roomId_seatNumber_key').on(t.roomId, t.seatNumber),
    index('Student_roomId_idx').on(t.roomId),
  ]
);

export const task = sqliteTable(
  'Task',
  {
    id: text('id').primaryKey().$defaultFn(uuid),
    name: text('name').notNull(),
    type: text('type').notNull(), // SUBMISSION | GRADE
    roomId: text('roomId')
      .notNull()
      .references(() => room.id),
    assignedSeatNumber: integer('assignedSeatNumber'),
    dueDate: integer('dueDate', { mode: 'timestamp_ms' }),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE | HELPER_COMPLETED | CLOSED
    isArchived: integer('isArchived', { mode: 'boolean' }).notNull().default(false),
    archivedAt: integer('archivedAt', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('Task_roomId_idx').on(t.roomId)]
);

export const record = sqliteTable(
  'Record',
  {
    id: text('id').primaryKey().$defaultFn(uuid),
    taskId: text('taskId')
      .notNull()
      .references(() => task.id),
    studentId: text('studentId')
      .notNull()
      .references(() => student.id),
    submissionStatus: text('submissionStatus'), // SUBMITTED | NOT_SUBMITTED（實際只存 SUBMITTED）
    gradeValue: integer('gradeValue'),
    recorderSeatNumber: integer('recorderSeatNumber').notNull(),
    isAssignedRecorder: integer('isAssignedRecorder', { mode: 'boolean' }).notNull(),
    syncedAt: integer('syncedAt', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('Record_taskId_studentId_key').on(t.taskId, t.studentId),
    index('Record_taskId_idx').on(t.taskId),
    index('Record_studentId_idx').on(t.studentId),
  ]
);

export const recordHandler = sqliteTable(
  'RecordHandler',
  {
    id: text('id').primaryKey().$defaultFn(uuid),
    recordId: text('recordId')
      .notNull()
      .references(() => record.id, { onDelete: 'cascade' }),
    seatNumber: integer('seatNumber').notNull(),
    handledAt: integer('handledAt', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('RecordHandler_recordId_idx').on(t.recordId)]
);

// ===== Relations（供 db.query 關聯查詢，取代 Prisma 的 include）=====

export const teacherRelations = relations(teacher, ({ many }) => ({
  rooms: many(room),
}));

export const roomRelations = relations(room, ({ one, many }) => ({
  teacher: one(teacher, { fields: [room.teacherId], references: [teacher.id] }),
  students: many(student),
  tasks: many(task),
}));

export const studentRelations = relations(student, ({ one, many }) => ({
  room: one(room, { fields: [student.roomId], references: [room.id] }),
  records: many(record),
}));

export const taskRelations = relations(task, ({ one, many }) => ({
  room: one(room, { fields: [task.roomId], references: [room.id] }),
  records: many(record),
}));

export const recordRelations = relations(record, ({ one, many }) => ({
  task: one(task, { fields: [record.taskId], references: [task.id] }),
  student: one(student, { fields: [record.studentId], references: [student.id] }),
  handlers: many(recordHandler),
}));

export const recordHandlerRelations = relations(recordHandler, ({ one }) => ({
  record: one(record, { fields: [recordHandler.recordId], references: [record.id] }),
}));

// 供 drizzle(client, { schema }) 使用的完整 schema 物件
export const schema = {
  teacher,
  room,
  student,
  task,
  record,
  recordHandler,
  teacherRelations,
  roomRelations,
  studentRelations,
  taskRelations,
  recordRelations,
  recordHandlerRelations,
};
