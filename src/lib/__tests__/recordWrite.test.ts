import { describe, it, expect } from 'vitest';
import { shouldAppendHandler } from '../recordWrite';

describe('shouldAppendHandler（相鄰同座號去重，FR-093）', () => {
  it('名單為空（第一次處理）→ 追加', () => {
    expect(shouldAppendHandler(null, 8)).toBe(true);
  });

  it('與最後一筆同座號 → 不追加', () => {
    expect(shouldAppendHandler(8, 8)).toBe(false);
  });

  it('與最後一筆不同座號 → 追加', () => {
    expect(shouldAppendHandler(8, 12)).toBe(true);
  });

  it('序列 8 → 12 → 8 逐步套用 → 三筆（穿插後的同座號各自記錄）', () => {
    // 模擬名單維護：last 為當前名單末筆座號
    const seq = [8, 12, 8];
    const list: number[] = [];
    for (const seat of seq) {
      const last = list.length > 0 ? list[list.length - 1] : null;
      if (shouldAppendHandler(last, seat)) list.push(seat);
    }
    expect(list).toEqual([8, 12, 8]);
  });

  it('序列 8 → 8 → 8 逐步套用 → 只留一筆（連續修正不灌爆）', () => {
    const seq = [8, 8, 8];
    const list: number[] = [];
    for (const seat of seq) {
      const last = list.length > 0 ? list[list.length - 1] : null;
      if (shouldAppendHandler(last, seat)) list.push(seat);
    }
    expect(list).toEqual([8]);
  });
});
