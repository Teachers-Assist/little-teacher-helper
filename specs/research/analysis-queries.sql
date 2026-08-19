-- ============================================================
-- 小老師助手 — 行為資料分析查詢
-- ============================================================
-- 目標資料庫：Cloudflare D1（線上）或 local.db（本機）
--
-- 執行方式：
--   線上   wrangler d1 execute <DB_NAME> --remote --command "<SQL>"
--   線上   wrangler d1 execute <DB_NAME> --remote --file analysis-queries.sql
--   本機   sqlite3 local.db < analysis-queries.sql
--
-- ⚠️ 時間欄位語意（讀之前必須知道，否則所有結論都是錯的）：
--   Record.createdAt / updatedAt / syncedAt  = **伺服器時間**（API route 執行時產生）
--                                              離線登記的 createdAt 是「同步進來的時間」
--   RecordHandler.handledAt                  = **操作原始時間**（離線時由 client 的
--                                              op.createdAt 帶入，見 api/sync/route.ts:92）
--                                              → 這才是「學生實際登記的時刻」
--
--   ⇒ 凡是要分析「什麼時候發生」，一律用 RecordHandler.handledAt，
--     絕對不要用 Record.createdAt。
--
-- 所有時間為 INTEGER 毫秒（UTC epoch）。台灣時間 = UTC+8 → 一律 +28800000 再取時。
-- ============================================================


-- ============================================================
-- 【圖一】登記行為的時鐘分布（核心圖，證明「時間控制權」）
-- ============================================================
-- 主張：老師不再被綁在下課 10 分鐘 → 登記行為應該散佈在一天各時段
-- 對應：vision.md §6「解決的是時間控制權，不是總工作量」

SELECT
  CAST(strftime('%H', datetime((h.handledAt + 28800000) / 1000, 'unixepoch')) AS INTEGER) AS hourTW,
  COUNT(*) AS registrations,
  COUNT(DISTINCT h.taskId) AS tasksTouched,
  COUNT(DISTINCT h.seatNumber) AS distinctSeats
FROM RecordHandler h
WHERE h.action = 'RECORD'
GROUP BY hourTW
ORDER BY hourTW;

-- 搭配用：把時段歸類成教學現場的實際區塊
-- （時段邊界請依實際學校作息調整，這裡用常見的國小作息）
SELECT
  CASE
    WHEN hourTW <  7 THEN '1_早於上學'
    WHEN hourTW <  8 THEN '2_早自習'
    WHEN hourTW < 12 THEN '3_上午課間'
    WHEN hourTW < 13 THEN '4_午休'
    WHEN hourTW < 16 THEN '5_下午課間'
    WHEN hourTW < 18 THEN '6_放學後在校'
    ELSE                  '7_晚間在家'
  END AS timeBlock,
  COUNT(*) AS registrations,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM RecordHandler WHERE action = 'RECORD'), 1) AS pct
FROM (
  SELECT CAST(strftime('%H', datetime((handledAt + 28800000) / 1000, 'unixepoch')) AS INTEGER) AS hourTW
  FROM RecordHandler
  WHERE action = 'RECORD'
)
GROUP BY timeBlock
ORDER BY timeBlock;

-- 星期分布（順帶看有沒有人在週末登記）
SELECT
  strftime('%w', datetime((handledAt + 28800000) / 1000, 'unixepoch')) AS dowTW,  -- 0=週日
  COUNT(*) AS registrations
FROM RecordHandler
WHERE action = 'RECORD'
GROUP BY dowTW
ORDER BY dowTW;


-- ============================================================
-- 【圖二】任務前置期：老師是不是「前一天有空的時候」建好任務
-- ============================================================
-- 主張：老師在自己選的時間設計結構，而不是臨時應付
-- 對應：vision.md §5「老師前一天有空的時候，把隔天需要登記的項目陸續建進系統」

SELECT
  t.id,
  t.name,
  t.type,
  datetime((t.createdAt + 28800000) / 1000, 'unixepoch')      AS taskCreatedTW,
  datetime((MIN(h.handledAt) + 28800000) / 1000, 'unixepoch') AS firstRecordTW,
  ROUND((MIN(h.handledAt) - t.createdAt) / 3600000.0, 1)      AS leadTimeHours
FROM Task t
JOIN RecordHandler h ON h.taskId = t.id
GROUP BY t.id
HAVING leadTimeHours IS NOT NULL
ORDER BY leadTimeHours DESC;

-- 前置期分級（> 12 小時 = 老師真的提前準備了）
SELECT
  CASE
    WHEN leadTimeHours <  1 THEN '1_1小時內（現場臨時建）'
    WHEN leadTimeHours <  6 THEN '2_當天早上建'
    WHEN leadTimeHours < 24 THEN '3_前一天建'
    ELSE                        '4_更早就建好'
  END AS leadBucket,
  COUNT(*) AS tasks
FROM (
  SELECT (MIN(h.handledAt) - t.createdAt) / 3600000.0 AS leadTimeHours
  FROM Task t JOIN RecordHandler h ON h.taskId = t.id
  GROUP BY t.id
)
WHERE leadTimeHours IS NOT NULL
GROUP BY leadBucket
ORDER BY leadBucket;

-- 老師建任務的時鐘分布（老師自己什麼時候在工作？）
SELECT
  CAST(strftime('%H', datetime((createdAt + 28800000) / 1000, 'unixepoch')) AS INTEGER) AS hourTW,
  COUNT(*) AS tasksCreated
FROM Task
GROUP BY hourTW
ORDER BY hourTW;


-- ============================================================
-- 【圖三】登記是「一口氣做完」還是「零碎時間慢慢做」
-- ============================================================
-- 主張：小老師在自己找得到的時間完成登記（下課、空堂、午休都可以）
-- 對應：vision.md §5「小老師在自己找得到的時間慢慢完成登記」
--
-- 方法：把同一任務的 handledAt 排序，算相鄰間隔。
--       間隔 > 10 分鐘視為一次「中斷」→ 中斷次數 + 1 = 分幾次做完（session 數）

WITH ordered AS (
  SELECT
    taskId,
    handledAt,
    LAG(handledAt) OVER (PARTITION BY taskId ORDER BY handledAt) AS prevHandledAt
  FROM RecordHandler
  WHERE action = 'RECORD'
)
SELECT
  t.name,
  COUNT(*)                                                       AS steps,
  ROUND((MAX(o.handledAt) - MIN(o.handledAt)) / 60000.0, 1)       AS spanMinutes,
  SUM(CASE WHEN o.handledAt - o.prevHandledAt > 600000 THEN 1 ELSE 0 END) + 1 AS sessions,
  ROUND(AVG(CASE WHEN o.prevHandledAt IS NOT NULL
                 THEN (o.handledAt - o.prevHandledAt) / 1000.0 END), 1)       AS avgGapSeconds
FROM ordered o
JOIN Task t ON t.id = o.taskId
GROUP BY o.taskId
ORDER BY sessions DESC;

-- 單筆登記的節奏（相鄰間隔的分布）→ 看小老師是連續掃過去還是斷斷續續
WITH gaps AS (
  SELECT (handledAt - LAG(handledAt) OVER (PARTITION BY taskId ORDER BY handledAt)) / 1000.0 AS gapSec
  FROM RecordHandler
  WHERE action = 'RECORD'
)
SELECT
  CASE
    WHEN gapSec <   5 THEN '1_5秒內（連續操作）'
    WHEN gapSec <  30 THEN '2_5-30秒'
    WHEN gapSec < 300 THEN '3_30秒-5分'
    WHEN gapSec < 3600 THEN '4_5分-1小時'
    ELSE                   '5_超過1小時（跨時段）'
  END AS gapBucket,
  COUNT(*) AS n
FROM gaps
WHERE gapSec IS NOT NULL
GROUP BY gapBucket
ORDER BY gapBucket;


-- ============================================================
-- 【圖四】離線功能到底有沒有被真的用到
-- ============================================================
-- 主張：「離線可用、自動同步」是產品賣點（推廣文案特色區塊 2）
-- 方法：Record.syncedAt（伺服器收到）− 該格最後一手 handledAt（實際操作）= 離線滯留時間
--
-- ⚠️ 限制一：syncedAt 每次 upsert 都被覆寫，所以只有「最後一次寫入」算得出滯留時間
-- ⚠️ 限制二：handledAt 是 client 時鐘，平板時鐘偏差會污染結果（可能出現負值）
--            → 建議加上 RecordHandler.receivedAt 與 isOffline 欄位根治，見提案 P0

SELECT
  r.id,
  r.recorderSeatNumber,
  datetime((MAX(h.handledAt) + 28800000) / 1000, 'unixepoch') AS handledTW,
  datetime((r.syncedAt      + 28800000) / 1000, 'unixepoch')  AS syncedTW,
  ROUND((r.syncedAt - MAX(h.handledAt)) / 1000.0, 1)          AS lagSeconds
FROM Record r
LEFT JOIN RecordHandler h ON h.taskId = r.taskId AND h.studentId = r.studentId
GROUP BY r.id
ORDER BY lagSeconds DESC;

-- 分級：多少比例的登記是離線產生的
SELECT
  CASE
    WHEN lagSeconds IS NULL  THEN '0_無經手鏈（004 之前的舊資料）'
    WHEN lagSeconds <     -5 THEN 'X_負值（client 時鐘偏快，資料不可用）'
    WHEN lagSeconds <      5 THEN '1_線上即時'
    WHEN lagSeconds <     60 THEN '2_1分鐘內同步'
    WHEN lagSeconds <   3600 THEN '3_1小時內同步'
    WHEN lagSeconds <  86400 THEN '4_當天內同步'
    ELSE                          '5_隔天以後才同步'
  END AS lagBucket,
  COUNT(*) AS n
FROM (
  SELECT (r.syncedAt - MAX(h.handledAt)) / 1000.0 AS lagSeconds
  FROM Record r
  LEFT JOIN RecordHandler h ON h.taskId = r.taskId AND h.studentId = r.studentId
  GROUP BY r.id
)
GROUP BY lagBucket
ORDER BY lagBucket;


-- ============================================================
-- 【圖五】承諾裝置（honor code）有沒有效
-- ============================================================
-- 主張：系統提示「你不是本次指定的小老師」但不阻擋，靠承諾裝置產生責任感
-- 對應：vision.md §7「小老師身份識別機制」+ 註腳 [^commitment]
--       —— vision 自己寫「實際效果在台灣小學情境中仍待驗證」
--
-- ⇒ 這個查詢直接回答 vision 自己標記為「待驗證」的假設。報告的亮點。

SELECT
  t.name,
  t.assignedSeatNumber,
  SUM(CASE WHEN r.isAssignedRecorder = 1 THEN 1 ELSE 0 END) AS byAssigned,
  SUM(CASE WHEN r.isAssignedRecorder = 0 THEN 1 ELSE 0 END) AS byOthers,
  ROUND(100.0 * SUM(CASE WHEN r.isAssignedRecorder = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS assignedPct
FROM Record r
JOIN Task t ON t.id = r.taskId
WHERE t.assignedSeatNumber IS NOT NULL   -- 只看「有指定人」的任務，沒指定的不算違規
GROUP BY t.id
ORDER BY assignedPct;

-- 整體比例（一個數字版，適合放進報告摘要）
SELECT
  COUNT(*)                                                   AS totalRecords,
  SUM(CASE WHEN r.isAssignedRecorder = 1 THEN 1 ELSE 0 END)  AS byAssigned,
  ROUND(100.0 * SUM(CASE WHEN r.isAssignedRecorder = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS assignedPct
FROM Record r
JOIN Task t ON t.id = r.taskId
WHERE t.assignedSeatNumber IS NOT NULL;


-- ============================================================
-- 【圖六】監督真的分散到學生群體了嗎（多人經手）
-- ============================================================
-- 主張：監督不必然由老師承擔，也可以是學生之間彼此可見、彼此核對的結果
-- 對應：vision.md §7「兩者都把監督從老師身上分散到學生群體」

-- 每一格的經手鏈長度分布
SELECT
  chainLen,
  COUNT(*) AS cells
FROM (
  SELECT taskId, studentId, COUNT(*) AS chainLen
  FROM RecordHandler
  GROUP BY taskId, studentId
)
GROUP BY chainLen
ORDER BY chainLen;

-- 多人經手的格子（不同座號動過同一格）—— 誠實商店的真實壓力測試
SELECT
  t.name       AS taskName,
  s.seatNumber AS studentSeat,
  s.name       AS studentName,
  COUNT(*)                        AS steps,
  COUNT(DISTINCT h.seatNumber)    AS distinctHandlers,
  GROUP_CONCAT(h.seatNumber || ':' || h.action, ' → ') AS chain
FROM RecordHandler h
JOIN Task t    ON t.id = h.taskId
JOIN Student s ON s.id = h.studentId
GROUP BY h.taskId, h.studentId
HAVING distinctHandlers > 1
ORDER BY distinctHandlers DESC, steps DESC;

-- DELETE 動作統計：有人把別人登的資料清掉了
SELECT
  action,
  COUNT(*) AS n,
  COUNT(DISTINCT taskId || ':' || studentId) AS cells
FROM RecordHandler
GROUP BY action;

-- 「跨座號的 DELETE」= A 清掉 B 登的（原則四要老師看得見的那種事）
WITH ordered AS (
  SELECT
    taskId, studentId, seatNumber, action, handledAt,
    LAG(seatNumber) OVER (PARTITION BY taskId, studentId ORDER BY handledAt) AS prevSeat
  FROM RecordHandler
)
SELECT
  t.name AS taskName, s.seatNumber AS studentSeat,
  o.prevSeat AS originalRecorder, o.seatNumber AS deletedBy,
  datetime((o.handledAt + 28800000) / 1000, 'unixepoch') AS whenTW
FROM ordered o
JOIN Task t    ON t.id = o.taskId
JOIN Student s ON s.id = o.studentId
WHERE o.action = 'DELETE' AND o.prevSeat IS NOT NULL AND o.prevSeat != o.seatNumber
ORDER BY o.handledAt DESC;


-- ============================================================
-- 【圖七】任務完成率與班級規模
-- ============================================================

SELECT
  rm.name AS roomName,
  t.name  AS taskName,
  t.type,
  t.status,
  (SELECT COUNT(*) FROM Student s WHERE s.roomId = rm.id AND s.isRemoved = 0) AS enrolled,
  (SELECT COUNT(*) FROM Record  r WHERE r.taskId  = t.id)                      AS recorded,
  ROUND(100.0 * (SELECT COUNT(*) FROM Record r WHERE r.taskId = t.id)
        / NULLIF((SELECT COUNT(*) FROM Student s WHERE s.roomId = rm.id AND s.isRemoved = 0), 0), 1)
        AS recordedPct
FROM Task t
JOIN Room rm ON rm.id = t.roomId
WHERE t.isArchived = 0
ORDER BY rm.name, t.createdAt;

-- 任務類型比較（SUBMISSION vs GRADE 的完成率、耗時、多人經手率）
SELECT
  t.type,
  COUNT(DISTINCT t.id) AS tasks,
  ROUND(AVG(spanMin), 1)   AS avgSpanMinutes,
  ROUND(AVG(steps), 1)     AS avgSteps
FROM Task t
JOIN (
  SELECT taskId,
         COUNT(*) AS steps,
         (MAX(handledAt) - MIN(handledAt)) / 60000.0 AS spanMin
  FROM RecordHandler WHERE action = 'RECORD' GROUP BY taskId
) agg ON agg.taskId = t.id
GROUP BY t.type;


-- ============================================================
-- 【圖八】採用漏斗（老師端）
-- ============================================================
-- 有多少老師建了班級但從來沒建任務？建了任務但從來沒人登記？
-- 這是「前十分鐘體驗」是否成功的實證（vision §4「主流老師如果前十分鐘不順暢，推薦就白費了」）

SELECT
  te.id,
  te.name,
  datetime((te.createdAt + 28800000) / 1000, 'unixepoch') AS signedUpTW,
  (SELECT COUNT(*) FROM Room rm WHERE rm.teacherId = te.id) AS rooms,
  (SELECT COUNT(*) FROM Student s JOIN Room rm ON rm.id = s.roomId
     WHERE rm.teacherId = te.id AND s.isRemoved = 0)        AS students,
  (SELECT COUNT(*) FROM Task t JOIN Room rm ON rm.id = t.roomId
     WHERE rm.teacherId = te.id)                           AS tasks,
  (SELECT COUNT(*) FROM Record r JOIN Task t ON t.id = r.taskId
     JOIN Room rm ON rm.id = t.roomId WHERE rm.teacherId = te.id) AS records
FROM Teacher te
ORDER BY records DESC, tasks DESC;

-- 漏斗摘要
SELECT
  COUNT(*)                                                AS teachers,
  SUM(CASE WHEN rooms    > 0 THEN 1 ELSE 0 END)            AS hasRoom,
  SUM(CASE WHEN students > 0 THEN 1 ELSE 0 END)            AS hasStudents,
  SUM(CASE WHEN tasks    > 0 THEN 1 ELSE 0 END)            AS hasTask,
  SUM(CASE WHEN records  > 0 THEN 1 ELSE 0 END)            AS hasRecord
FROM (
  SELECT te.id,
    (SELECT COUNT(*) FROM Room rm WHERE rm.teacherId = te.id) AS rooms,
    (SELECT COUNT(*) FROM Student s JOIN Room rm ON rm.id = s.roomId
       WHERE rm.teacherId = te.id AND s.isRemoved = 0) AS students,
    (SELECT COUNT(*) FROM Task t JOIN Room rm ON rm.id = t.roomId
       WHERE rm.teacherId = te.id) AS tasks,
    (SELECT COUNT(*) FROM Record r JOIN Task t ON t.id = r.taskId
       JOIN Room rm ON rm.id = t.roomId WHERE rm.teacherId = te.id) AS records
  FROM Teacher te
);
