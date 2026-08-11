import { describe, it, expect } from 'vitest';
import { shouldAppendHandler } from '../recordWrite';
import type { HandlerStep } from '../recordHandlerRule';

const rec = (seatNumber: number): HandlerStep => ({ seatNumber, action: 'RECORD' });
const del = (seatNumber: number): HandlerStep => ({ seatNumber, action: 'DELETE' });

/** 逐步套用一串處理，回傳實際被留下的名單。 */
function applyChain(steps: HandlerStep[]): HandlerStep[] {
  const list: HandlerStep[] = [];
  for (const step of steps) {
    const last = list.length > 0 ? list[list.length - 1] : null;
    if (shouldAppendHandler(last, step)) list.push(step);
  }
  return list;
}

/** 老師端「多人經手」徽章的判準（TaskResultView）：名單含 ≥2 個不同座號。 */
const isMultiHandler = (chain: HandlerStep[]) =>
  new Set(chain.map((h) => h.seatNumber)).size >= 2;

describe('shouldAppendHandler（相鄰去重，FR-093）', () => {
  it('名單為空（第一次處理）→ 追加', () => {
    expect(shouldAppendHandler(null, rec(8))).toBe(true);
  });

  it('與最後一筆同座號同動作 → 不追加', () => {
    expect(shouldAppendHandler(rec(8), rec(8))).toBe(false);
  });

  it('與最後一筆不同座號 → 追加', () => {
    expect(shouldAppendHandler(rec(8), rec(12))).toBe(true);
  });

  it('同座號但動作不同（刪除後又登記）→ 追加', () => {
    expect(shouldAppendHandler(del(8), rec(8))).toBe(true);
    expect(shouldAppendHandler(rec(8), del(8))).toBe(true);
  });

  it('序列 8 → 12 → 8 → 三筆（穿插後的同座號各自記錄）', () => {
    expect(applyChain([rec(8), rec(12), rec(8)]).map((h) => h.seatNumber)).toEqual([8, 12, 8]);
  });

  it('序列 8 → 8 → 8 → 只留一筆（連續修正不灌爆）', () => {
    expect(applyChain([rec(8), rec(8), rec(8)])).toHaveLength(1);
  });

  it('同座號連續刪除 → 只留一筆（刪除同樣適用去重）', () => {
    expect(applyChain([rec(8), del(8), del(8), del(8)])).toHaveLength(2);
  });
});

// ── 測試回饋問題四回報的兩個情境（FR-093a）─────────────────────────────
describe('刪除不再抹掉經手鏈', () => {
  // 「改成別的數字」在成績欄常常是先清空再重打。舊實作把清空當成刪除記錄，
  // 連 handlers 一起 cascade 掉，鏈於是被重設成只剩最後一人。
  it('12 號把 8 號登的清空再重打 → 鏈保留 8，仍判定多人經手', () => {
    const chain = applyChain([rec(8), del(12), rec(12)]);
    expect(chain.map((h) => h.seatNumber)).toEqual([8, 12, 12]);
    expect(chain[1].action).toBe('DELETE');
    expect(chain[2].action).toBe('RECORD');
    expect(isMultiHandler(chain)).toBe(true);
  });

  // 使用者提問的情境：A 登記 → B 刪掉 → A 發現後補回。
  // 舊實作在 B 刪除時清鏈、A 補回時重建成 [A]，老師完全看不出 B 動過手。
  it('A 登記 → B 刪除 → A 補回 → 鏈為 A、B(刪除)、A，老師看得出 B 介入過', () => {
    const chain = applyChain([rec(8), del(12), rec(8)]);
    expect(chain).toEqual([rec(8), del(12), rec(8)]);
    expect(isMultiHandler(chain)).toBe(true);
  });

  it('反覆換人接手仍持續累積，不會停在長度 1', () => {
    const chain = applyChain([rec(8), del(12), rec(12), del(5), rec(5)]);
    expect(chain.map((h) => h.seatNumber)).toEqual([8, 12, 12, 5, 5]);
    expect(isMultiHandler(chain)).toBe(true);
  });

  it('全程單人（登記 → 自己清空 → 自己重打）→ 不誤判為多人經手', () => {
    const chain = applyChain([rec(8), del(8), rec(8)]);
    expect(chain).toHaveLength(3);
    expect(isMultiHandler(chain)).toBe(false);
  });
});
