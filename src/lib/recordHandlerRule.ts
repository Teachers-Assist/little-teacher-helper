// 順序處理者名單的追加規則（004 US4）——純函式、無伺服器相依，故可同時被
// 伺服器寫入路徑（recordWrite.ts）與純前端示範沙盒（lib/demo/store.ts）共用，
// 確保「多人經手」判定單一真相、可追溯（非各自寫死）。

/**
 * 是否該把這次處理追加到名單（FR-093）：只有「與名單最後一筆座號不同」才追加，
 * 避免同一座號連續修正把名單灌爆。被其他座號穿插後的同座號再次修改仍各自記錄
 * （例：8 → 12 → 8 保留三筆；8 → 8 → 8 只留一筆）。
 */
export function shouldAppendHandler(lastSeat: number | null | undefined, seat: number): boolean {
  return lastSeat !== seat;
}
