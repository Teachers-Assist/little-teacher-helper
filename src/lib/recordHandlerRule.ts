// 順序處理者名單的追加規則（004 US4）——純函式、無伺服器相依，故可同時被
// 伺服器寫入路徑（recordWrite.ts）與純前端示範沙盒（lib/demo/store.ts）共用，
// 確保「多人經手」判定單一真相、可追溯（非各自寫死）。

/**
 * 這一手做了什麼。
 * - 'RECORD'：登記或修改成一個值
 * - 'DELETE'：把這一格清成「沒登記」（取消勾選 / 清空成績）
 *
 * 刪除也是一次經手：它同樣是「某個座號動過這一格」，而且是老師最需要知道的那種
 * （有人把別人登的資料清掉了）。經手鏈 MUST NOT 因刪除而消失，見 FR-093a。
 */
export type HandlerAction = 'RECORD' | 'DELETE';

export interface HandlerStep {
  seatNumber: number;
  action: HandlerAction;
}

/**
 * 是否該把這次處理追加到名單（FR-093）：與名單最後一筆**座號或動作任一不同**才追加。
 *
 * 座號相同且動作相同＝同一個人連續做同一件事（連續修正成績），只留一筆，避免灌爆名單。
 * 被其他座號穿插後的同座號再次修改仍各自記錄（例：8 → 12 → 8 保留三筆）。
 *
 * 動作也要比對的理由：同一座號「先刪掉、再重新登記」是兩件不同的事，只看座號會讓名單
 * 停在「8 號刪除」卻顯示著一個值，老師看到的順序與實際發生的不符。
 */
export function shouldAppendHandler(
  last: HandlerStep | null | undefined,
  next: HandlerStep
): boolean {
  if (!last) return true;
  return last.seatNumber !== next.seatNumber || last.action !== next.action;
}
