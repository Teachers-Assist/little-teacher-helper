import { describe, it, expect } from 'vitest';
import { buildSeatIndex, seatConflictError, type SeatHolder } from '@/lib/seatHolder';
import { ERROR_CODES } from '@/i18n/errorCodes';
import { resolveError } from '@/i18n/resolveError';
import { messages as zhTW } from '@/messages/zh-TW';
import { messages as en } from '@/messages/en';

// 座號被「已移除」學生佔用時，老師在名單上看不到佔用者。若沿用「與現有學生重複」
// 的文案，老師會拿著 Excel 找一個根本不存在的重複。這裡守的是兩種成因不被混為一談。

const holder = (seatNumber: number, name: string, isRemoved: boolean): SeatHolder => ({
  seatNumber,
  name,
  isRemoved,
});

describe('buildSeatIndex', () => {
  it('把在籍與已移除的座號分流，已移除者留下姓名', () => {
    const { activeSeats, removedBySeat } = buildSeatIndex([
      holder(1, '王小明', true),
      holder(2, '陳小美', false),
    ]);

    expect(activeSeats.has(2)).toBe(true);
    expect(activeSeats.has(1)).toBe(false);
    expect(removedBySeat.get(1)).toBe('王小明');
    expect(removedBySeat.has(2)).toBe(false);
  });

  it('沒有已移除學生時不產生任何佔用紀錄', () => {
    const { activeSeats, removedBySeat } = buildSeatIndex([holder(5, '林小華', false)]);
    expect(removedBySeat.size).toBe(0);
    expect(activeSeats.has(5)).toBe(true);
  });
});

describe('seatConflictError', () => {
  it('佔用者仍在名單上 → 沿用既有的「已存在」碼，不帶參數', () => {
    const err = seatConflictError(holder(1, '陳小美', false));
    expect(err.error).toBe(ERROR_CODES.STUDENT_SEAT_DUPLICATE);
    expect(err.params).toBeUndefined();
  });

  it('佔用者已移除 → 專屬碼，並帶出座號與姓名', () => {
    const err = seatConflictError(holder(1, '王小明', true));
    expect(err.error).toBe(ERROR_CODES.STUDENT_SEAT_DUPLICATE_REMOVED);
    expect(err.params).toEqual({ seatNumber: 1, name: '王小明' });
  });
});

describe('已移除座號衝突的文案', () => {
  it('中文點名座號與姓名，並說明出路', () => {
    const err = seatConflictError(holder(1, '王小明', true));
    const text = resolveError(zhTW, err.error, err.params);

    expect(text).toBe(
      '座號 1 屬於已移除的學生王小明。如需使用此座號請還原已移除學生並重新編輯姓名'
    );
    expect(text).not.toBe(zhTW.common.error);
  });

  it('英文同樣點名座號與姓名', () => {
    const err = seatConflictError(holder(1, 'Ming', true));
    const text = resolveError(en, err.error, err.params);

    expect(text).toContain('Seat 1');
    expect(text).toContain('Ming');
    expect(text).not.toBe(en.common.error);
  });

  it('缺少 params 時退回通用訊息，畫面不會壞', () => {
    expect(resolveError(zhTW, ERROR_CODES.STUDENT_SEAT_DUPLICATE_REMOVED)).toBe(zhTW.common.error);
  });

  it('params 形狀不對時退回通用訊息，不會端出半成品文案', () => {
    for (const bad of ['nope', 42, {}, { seatNumber: 1 }, { name: '王小明' }]) {
      const text = resolveError(zhTW, ERROR_CODES.STUDENT_SEAT_DUPLICATE_REMOVED, bad);
      expect(text).toBe(zhTW.common.error);
      expect(text).not.toContain('undefined');
    }
  });

  it('與「與現有學生重複」是不同的兩句話', () => {
    const removed = resolveError(zhTW, ERROR_CODES.STUDENT_SEAT_DUPLICATE_REMOVED, {
      seatNumber: 1,
      name: '王小明',
    });
    expect(removed).not.toBe(zhTW.student.seatDuplicate);
  });
});
