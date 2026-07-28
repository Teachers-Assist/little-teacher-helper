-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "roomId" TEXT NOT NULL,
    "isRemoved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "assignedSeatNumber" INTEGER,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "submissionStatus" TEXT,
    "gradeValue" INTEGER,
    "recorderSeatNumber" INTEGER NOT NULL,
    "isAssignedRecorder" BOOLEAN NOT NULL,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Record_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Record_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordHandler" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "handledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecordHandler_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_teacherId_idx" ON "Room"("teacherId");

-- CreateIndex
CREATE INDEX "Room_code_idx" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Student_roomId_idx" ON "Student"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_roomId_seatNumber_key" ON "Student"("roomId", "seatNumber");

-- CreateIndex
CREATE INDEX "Task_roomId_idx" ON "Task"("roomId");

-- CreateIndex
CREATE INDEX "Record_taskId_idx" ON "Record"("taskId");

-- CreateIndex
CREATE INDEX "Record_studentId_idx" ON "Record"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Record_taskId_studentId_key" ON "Record"("taskId", "studentId");

-- CreateIndex
CREATE INDEX "RecordHandler_recordId_idx" ON "RecordHandler"("recordId");

