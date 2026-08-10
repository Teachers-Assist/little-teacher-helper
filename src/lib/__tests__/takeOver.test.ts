import { describe, it, expect } from 'vitest';
import { detectTakeOver } from '../takeOver';
import type { OfflineRecordEntry } from '@/types';

const ME = 5;

/** 建一筆登記：指定登記者座號與時間戳，其餘欄位不影響判定。 */
function rec(recorderSeatNumber: number, updatedAt: string): OfflineRecordEntry {
  return {
    submissionStatus: undefined,
    gradeValue: 80,
    recorderSeatNumber,
    isAssignedRecorder: false,
    updatedAt,
  };
}

describe('detectTakeOver（US9 接手提示判定）', () => {
  it('全新任務無登記 → 不提示（FR-128）', () => {
    expect(detectTakeOver({}, ME)).toBeNull();
  });

  it('全部由自己登 → 不提示（FR-128）', () => {
    const records = {
      s1: rec(ME, '2026-08-10T10:00:00.000Z'),
      s2: rec(ME, '2026-08-10T10:05:00.000Z'),
    };
    expect(detectTakeOver(records, ME)).toBeNull();
  });

  it('只有他人登過 → 提示該座號', () => {
    const records = {
      s1: rec(8, '2026-08-10T10:00:00.000Z'),
      s2: rec(8, '2026-08-10T10:05:00.000Z'),
    };
    expect(detectTakeOver(records, ME)).toBe(8);
  });

  // 這組是本次修正的核心：舊的「多數決」會答 8，正確答案是最近在做的 12
  it('多人輪流：座號 8 登得多、座號 12 登得晚 → 提示最新的 12，而非筆數最多的 8', () => {
    const records = {
      s1: rec(8, '2026-08-10T10:00:00.000Z'),
      s2: rec(8, '2026-08-10T10:01:00.000Z'),
      s3: rec(8, '2026-08-10T10:02:00.000Z'),
      s4: rec(8, '2026-08-10T10:03:00.000Z'),
      s5: rec(12, '2026-08-10T11:00:00.000Z'),
    };
    expect(detectTakeOver(records, ME)).toBe(12);
  });

  // 舊邏輯會先 filter 掉自己，導致「自己才是最新」時仍提示要接手別人
  it('自己接手後重整：他人登得多但自己登得最晚 → 不提示（自己就是目前接手者）', () => {
    const records = {
      s1: rec(8, '2026-08-10T10:00:00.000Z'),
      s2: rec(8, '2026-08-10T10:01:00.000Z'),
      s3: rec(8, '2026-08-10T10:02:00.000Z'),
      s4: rec(ME, '2026-08-10T11:00:00.000Z'),
    };
    expect(detectTakeOver(records, ME)).toBeNull();
  });

  it('他人覆蓋自己較早的登記 → 提示該他人座號', () => {
    const records = {
      s1: rec(ME, '2026-08-10T10:00:00.000Z'),
      s2: rec(9, '2026-08-10T10:30:00.000Z'),
    };
    expect(detectTakeOver(records, ME)).toBe(9);
  });

  it('時間戳平手且含他人（批次同步同毫秒）→ 提示，取座號最小的他人', () => {
    const t = '2026-08-10T10:00:00.000Z';
    const records = { s1: rec(ME, t), s2: rec(12, t), s3: rec(9, t) };
    expect(detectTakeOver(records, ME)).toBe(9);
  });

  it('最新時間戳只有自己、較早才有他人 → 不提示', () => {
    const records = {
      s1: rec(8, '2026-08-10T09:00:00.000Z'),
      s2: rec(ME, '2026-08-10T10:00:00.000Z'),
      s3: rec(ME, '2026-08-10T10:00:00.000Z'),
    };
    expect(detectTakeOver(records, ME)).toBeNull();
  });

  it('物件插入順序不影響結果（最新者最先出現時也正確）', () => {
    const records = {
      s1: rec(12, '2026-08-10T11:00:00.000Z'),
      s2: rec(8, '2026-08-10T10:00:00.000Z'),
      s3: rec(8, '2026-08-10T10:01:00.000Z'),
    };
    expect(detectTakeOver(records, ME)).toBe(12);
  });
});
