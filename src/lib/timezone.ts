// 時區工具（004 US6 / NFR-016）。
//
// 執行環境為 Cloudflare Workers（UTC），異常規則的絕對時鐘（截止日當天 08:00）與截止時間
// 寫入（當天 17:00）都 MUST 綁定 Asia/Taipei，MUST NOT 依賴伺服器本地時區。台灣無日光節約
// 時間，故固定 +08:00 偏移即可，不需 IANA 時區資料庫。

/** Asia/Taipei 相對 UTC 的固定偏移（+8 小時，無 DST）。 */
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 取「input 所在的台北日曆日」當天 hour:00:00（台北牆上時鐘）對應的 UTC 時刻。
 *
 * 用途：
 *   - 規則二：`taipeiDayStartAt(dueDate, 8)` ＝ 截止日當天台北 08:00（早自習提醒點）
 *   - 截止寫入：`taipeiDayStartAt(selectedDate, 17)` ＝ 當天台北 17:00（放學鎖定點）
 *
 * 作法：先把 input 位移到台北牆上時鐘、用 UTC getter 取出台北的年月日（避開伺服器本地時區），
 * 再把「台北該日 hour:00」換回 UTC 時刻（減 8 小時）。跨日（如台北凌晨、input 落在前一 UTC 日）
 * 會正確歸屬到台北當日。
 *
 * @param date 代表某一天的時間點（Date / ISO 字串 / epoch ms）。例：`<input type="date">` 的
 *   "2026-07-27"（＝ UTC 午夜＝台北當日 08:00），或既有的 dueDate。
 * @param hour 台北當地的小時（0–23）
 * @returns 對應的 UTC `Date`
 */
export function taipeiDayStartAt(date: Date | string | number, hour: number): Date {
  const t = new Date(date).getTime();
  // 位移到台北牆上時鐘，用 UTC getter 取出台北的年 / 月 / 日
  const taipei = new Date(t + TAIPEI_OFFSET_MS);
  const y = taipei.getUTCFullYear();
  const m = taipei.getUTCMonth();
  const d = taipei.getUTCDate();
  // 台北該日 hour:00:00 → 對應 UTC 時刻 = Date.UTC(該日, hour) − 8h
  return new Date(Date.UTC(y, m, d, hour, 0, 0, 0) - TAIPEI_OFFSET_MS);
}
