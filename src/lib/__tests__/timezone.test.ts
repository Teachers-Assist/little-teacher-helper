import { describe, it, expect } from 'vitest';
import { taipeiDayStartAt } from '../timezone';

describe('taipeiDayStartAt', () => {
  it('hour=17：日期選擇（UTC 午夜）→ 當天台北 17:00 = 09:00Z', () => {
    // "2026-07-27" ＝ 2026-07-27T00:00Z ＝ 台北 07-27 08:00 → 台北日曆日 07-27
    const r = taipeiDayStartAt('2026-07-27', 17);
    expect(r.toISOString()).toBe('2026-07-27T09:00:00.000Z'); // 台北 17:00
  });

  it('hour=8：截止日當天台北 08:00 = 前一日 00:00Z 的隔日 00:00Z', () => {
    const r = taipeiDayStartAt('2026-07-27', 8);
    expect(r.toISOString()).toBe('2026-07-27T00:00:00.000Z'); // 台北 08:00 = UTC 00:00
  });

  it('台北傍晚（同一 UTC 日）歸屬台北當日', () => {
    // 2026-07-27T15:30Z ＝ 台北 07-27 23:30 → 台北日 07-27
    const r = taipeiDayStartAt('2026-07-27T15:30:00.000Z', 8);
    expect(r.toISOString()).toBe('2026-07-27T00:00:00.000Z');
  });

  it('台北凌晨（input 落在前一 UTC 日）正確歸到台北隔日', () => {
    // 2026-07-27T16:30Z ＝ 台北 07-28 00:30 → 台北日 07-28
    const r = taipeiDayStartAt('2026-07-27T16:30:00.000Z', 8);
    expect(r.toISOString()).toBe('2026-07-28T00:00:00.000Z'); // 台北 07-28 08:00
  });

  it('接受既有 dueDate（台北 17:00 存值）並還原同一台北日的 08:00', () => {
    // 台北 07-27 17:00 = 09:00Z；取當天 08:00 → 00:00Z
    const due = new Date('2026-07-27T09:00:00.000Z');
    expect(taipeiDayStartAt(due, 8).toISOString()).toBe('2026-07-27T00:00:00.000Z');
  });
});
