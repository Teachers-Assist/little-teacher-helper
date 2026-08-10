-- RecordHandler 改以 (taskId, studentId) 為 key，並記錄動作類型。
--
-- 原本掛在 Record.id 上並帶 ON DELETE CASCADE：一旦該格的登記被刪除（清空成績、
-- 取消勾選），整條經手鏈跟著消失。實務上「改成別的數字」常常是先清空再重打，
-- 於是鏈被反覆抹掉，老師看不出這一格曾被多人動過（2026-08-10 測試回饋問題四）。
--
-- 經手歷史屬於「那一格」，不屬於「目前存在的那筆登記」，故改以 (taskId, studentId)
-- 為 key，生命週期改由 Task / Student 連坐。
--
-- SQLite 無法直接改欄位與外鍵，走 new-table → backfill → swap。
-- 既有列以 Record join 回填 taskId / studentId；歷史資料無從得知動作類型，
-- 一律視為 'RECORD'（既有鏈本來就只在寫入時追加，不含刪除）。
-- join 不到 Record 的孤兒列（理論上不存在，cascade 會清掉）會被自然丟棄。

CREATE TABLE "RecordHandler_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'RECORD',
    -- INTEGER（Unix ms），非 DATETIME DEFAULT CURRENT_TIMESTAMP：時間戳一律由應用層以
    -- 毫秒整數寫入，SQL 端的 CURRENT_TIMESTAMP 會寫成 TEXT 而讀不回來（見 data-model.md
    -- 儲存相容性）。原表宣告為 DATETIME 但實際存的就是整數，此處改為與事實一致。
    "handledAt" INTEGER NOT NULL,
    CONSTRAINT "RecordHandler_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordHandler_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "RecordHandler_new" ("id", "taskId", "studentId", "seatNumber", "action", "handledAt")
SELECT h."id", r."taskId", r."studentId", h."seatNumber", 'RECORD', h."handledAt"
FROM "RecordHandler" h
INNER JOIN "Record" r ON r."id" = h."recordId";

DROP TABLE "RecordHandler";

ALTER TABLE "RecordHandler_new" RENAME TO "RecordHandler";

CREATE INDEX "RecordHandler_taskId_studentId_idx" ON "RecordHandler"("taskId", "studentId");
