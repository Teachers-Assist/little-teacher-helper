import { describe, it, expect } from 'vitest';
import { mergeRecords } from '../overlay';
import { OfflineRecordEntry, OfflineSyncQueueItem, SubmissionStatus } from '@/types';

function baseEntry(partial: Partial<OfflineRecordEntry>): OfflineRecordEntry {
  return {
    submissionStatus: undefined,
    gradeValue: undefined,
    recorderSeatNumber: 1,
    isAssignedRecorder: false,
    updatedAt: '2026-07-26T00:00:00.000Z',
    synced: true,
    ...partial,
  };
}

function op(
  studentId: string,
  payload: Partial<OfflineSyncQueueItem['payload']>
): OfflineSyncQueueItem {
  return {
    id: `op-${studentId}`,
    type: 'UPDATE_RECORD',
    payload: {
      taskId: 't1',
      studentId,
      recorderSeatNumber: 8,
      ...payload,
    },
    createdAt: '2026-07-26T01:00:00.000Z',
    retryCount: 0,
  };
}

describe('mergeRecords (overlay 疊加)', () => {
  it('base-only：無待送 op 時原封回傳 base（且維持同一參照）', () => {
    const base = { s1: baseEntry({ gradeValue: 90 }) };
    const result = mergeRecords(base, []);
    expect(result).toBe(base); // 參照穩定，利於 React memo
    expect(result.s1.gradeValue).toBe(90);
  });

  it('overlay-only：base 無此學生、佇列有 op → 顯示 op 值（synced=false）', () => {
    const result = mergeRecords({}, [op('s1', { gradeValue: 77, recorderSeatNumber: 8 })], 8);
    expect(result.s1.gradeValue).toBe(77);
    expect(result.s1.recorderSeatNumber).toBe(8);
    expect(result.s1.synced).toBe(false);
    expect(result.s1.isAssignedRecorder).toBe(true); // assignedSeatNumber 8 === recorder 8
  });

  it('overlay=刪除：op 為取消勾選 / 清空成績 → 該學生視為「沒登記」', () => {
    const base = { s1: baseEntry({ submissionStatus: SubmissionStatus.SUBMITTED }) };
    // 取消勾選（NOT_SUBMITTED）
    const uncheck = mergeRecords(base, [op('s1', { submissionStatus: SubmissionStatus.NOT_SUBMITTED })]);
    expect(uncheck.s1).toBeUndefined();
    // 清空成績（submissionStatus 與 gradeValue 皆無）
    const clearGrade = mergeRecords({ s1: baseEntry({ gradeValue: 60 }) }, [op('s1', {})]);
    expect(clearGrade.s1).toBeUndefined();
  });

  it('base+overlay：overlay 優先覆蓋同一學生，未被 op 觸及的 base 學生保留', () => {
    const base = {
      s1: baseEntry({ gradeValue: 50, synced: true }),
      s2: baseEntry({ gradeValue: 60, synced: true }),
    };
    // s1 被離線改成 88（未同步）；s2 沒有 op
    const result = mergeRecords(base, [op('s1', { gradeValue: 88 })]);
    expect(result.s1.gradeValue).toBe(88);
    expect(result.s1.synced).toBe(false); // overlay 值＝未同步
    expect(result.s2.gradeValue).toBe(60); // base 保留
    expect(result.s2.synced).toBe(true);
    expect(base.s1.gradeValue).toBe(50); // 不可變動原 base 物件
  });

  it('繳交類：op submissionStatus=SUBMITTED → 顯示已繳交、gradeValue 為空', () => {
    const result = mergeRecords({}, [op('s1', { submissionStatus: SubmissionStatus.SUBMITTED })]);
    expect(result.s1.submissionStatus).toBe(SubmissionStatus.SUBMITTED);
    expect(result.s1.gradeValue).toBeUndefined();
  });
});
