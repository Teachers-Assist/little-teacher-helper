import { describe, it, expect } from 'vitest';
import { mergeRecords, applyAckedOp } from '../overlay';
import { OfflineData, OfflineRecordEntry, OfflineSyncQueueItem, SubmissionStatus } from '@/types';

function baseEntry(partial: Partial<OfflineRecordEntry>): OfflineRecordEntry {
  return {
    submissionStatus: undefined,
    gradeValue: undefined,
    recorderSeatNumber: 1,
    isAssignedRecorder: false,
    updatedAt: '2026-07-26T00:00:00.000Z',
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
    rev: 0,
  };
}

describe('mergeRecords (overlay 疊加)', () => {
  it('base-only：無待送 op 時原封回傳 base（且維持同一參照）', () => {
    const base = { s1: baseEntry({ gradeValue: 90 }) };
    const result = mergeRecords(base, []);
    expect(result).toBe(base); // 參照穩定，利於 React memo
    expect(result.s1.gradeValue).toBe(90);
  });

  it('overlay-only：base 無此學生、佇列有 op → 顯示 op 值', () => {
    const result = mergeRecords({}, [op('s1', { gradeValue: 77, recorderSeatNumber: 8 })], 8);
    expect(result.s1.gradeValue).toBe(77);
    expect(result.s1.recorderSeatNumber).toBe(8);
    expect(result.s1.updatedAt).toBe('2026-07-26T01:00:00.000Z'); // 取自 op（未同步變更）
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
      s1: baseEntry({ gradeValue: 50 }),
      s2: baseEntry({ gradeValue: 60 }),
    };
    // s1 被離線改成 88（未同步，overlay 有 op）；s2 沒有 op（仍為 base 值）
    const result = mergeRecords(base, [op('s1', { gradeValue: 88 })]);
    expect(result.s1.gradeValue).toBe(88); // overlay 值優先
    expect(result.s2.gradeValue).toBe(60); // base 保留
    expect(base.s1.gradeValue).toBe(50); // 不可變動原 base 物件
  });

  it('繳交類：op submissionStatus=SUBMITTED → 顯示已繳交、gradeValue 為空', () => {
    const result = mergeRecords({}, [op('s1', { submissionStatus: SubmissionStatus.SUBMITTED })]);
    expect(result.s1.submissionStatus).toBe(SubmissionStatus.SUBMITTED);
    expect(result.s1.gradeValue).toBeUndefined();
  });
});

describe('applyAckedOp (ack 後沉澱到 base)', () => {
  it('upsert：成功的成績 op 寫回 base', () => {
    const records: OfflineData['records'] = {};
    applyAckedOp(records, op('s1', { gradeValue: 88 }));
    expect(records.t1.s1.gradeValue).toBe(88);
    expect(records.t1.s1.recorderSeatNumber).toBe(8);
  });

  it('delete：成功的取消/清空 op 從 base 移除該學生', () => {
    const records: OfflineData['records'] = {
      t1: { s1: baseEntry({ gradeValue: 60 }) },
    };
    applyAckedOp(records, op('s1', {})); // 清空成績意圖
    expect(records.t1.s1).toBeUndefined();
  });

  it('保留既有 base 的 isAssignedRecorder（權威值待 refetch 校正）', () => {
    const records: OfflineData['records'] = {
      t1: { s1: baseEntry({ gradeValue: 50, isAssignedRecorder: true }) },
    };
    applyAckedOp(records, op('s1', { gradeValue: 70 }));
    expect(records.t1.s1.isAssignedRecorder).toBe(true);
    expect(records.t1.s1.gradeValue).toBe(70);
  });
});
