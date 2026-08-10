// 載入時「已有人登過」接手提示的判定（004 US9 / FR-126~129）。
// 抽為純函式供測試：學生端頁面只負責把 store 資料餵進來並呈現結果。

import type { OfflineRecordEntry } from '@/types';

/**
 * 找出該任務「目前接手者」的座號——若不是本人則回傳該座號（＝應提示接手），否則回傳 null。
 *
 * 判準：以該任務**所有登記中最新的那一筆**（updatedAt 最晚）決定誰是目前接手者——
 * 多人輪流接手時，登記筆數多寡不代表誰最近在做，故 MUST NOT 用「筆數最多者」判定。
 *
 * 回傳 null（不提示）的情況：
 *   - 任務全新、無任何登記（FR-128）
 *   - 最新一筆是本人所登 —— 本人即目前接手者，含「全部由自己登」（FR-128）
 *   - 離線冷啟動無快取時 records 為空，落在第一種（FR-129）
 *
 * 同時間戳（毫秒相同，例如一次批次同步寫入多筆）的平手處理：
 * 只要最新時間戳上**存在他人**的登記就提示，並取其中座號最小者，確保結果穩定可預期。
 * 平手時偏向「提示」而非「不提示」——提示不阻擋操作且有兩條出路（FR-127），
 * 漏提示則會讓碰撞悄悄發生，代價不對稱。
 *
 * @param records 該任務的登記（key = 被登記學生 studentId；已疊加 overlay 未同步變更）
 * @param mySeatNumber 本人座號
 * @returns 目前接手者座號（非本人時）；無須提示時為 null
 */
export function detectTakeOver(
  records: { [studentId: string]: OfflineRecordEntry },
  mySeatNumber: number
): number | null {
  const all = Object.values(records);
  if (all.length === 0) return null; // 全新任務 → 不提示（FR-128）

  const latestAt = all.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), all[0].updatedAt);
  const latestByOthers = all.filter(
    (r) => r.updatedAt === latestAt && r.recorderSeatNumber !== mySeatNumber
  );
  // 最新一筆（含平手）全是自己 → 自己就是目前接手者 → 不提示（FR-128）
  if (latestByOthers.length === 0) return null;

  return latestByOthers.reduce((a, b) => (b.recorderSeatNumber < a.recorderSeatNumber ? b : a))
    .recorderSeatNumber;
}
