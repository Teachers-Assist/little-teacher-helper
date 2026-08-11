import { describe, it, expect } from 'vitest';
import { getTaskLockReason } from '../task';
import { TaskStatus } from '@/types';

const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + HOUR);
const past = () => new Date(Date.now() - HOUR);

describe('getTaskLockReason（鎖定成因三態）', () => {
  it('進行中且未截止 → 未鎖定', () => {
    expect(getTaskLockReason({ status: TaskStatus.ACTIVE, dueDate: future() })).toBeNull();
  });

  it('進行中且無截止時間 → 未鎖定', () => {
    expect(getTaskLockReason({ status: TaskStatus.ACTIVE, dueDate: null })).toBeNull();
  });

  it('小老師自行標記完成 → HELPER_COMPLETED', () => {
    expect(getTaskLockReason({ status: TaskStatus.HELPER_COMPLETED })).toBe('HELPER_COMPLETED');
  });

  // 這組是本次修正的核心：老師結案曾與「小老師標記完成」共用 'COMPLETED'，
  // 導致學生被告知「你已經標記完畢了」——一件他沒做過的事（測試回饋問題一）
  it('老師結案 → CLOSED，MUST NOT 與 HELPER_COMPLETED 混同', () => {
    expect(getTaskLockReason({ status: TaskStatus.CLOSED })).toBe('CLOSED');
  });

  it('截止時間已過但狀態仍為進行中 → DUE_PASSED', () => {
    expect(getTaskLockReason({ status: TaskStatus.ACTIVE, dueDate: past() })).toBe('DUE_PASSED');
  });

  it('狀態鎖定優先於截止逾期（結案且已過截止 → CLOSED）', () => {
    expect(getTaskLockReason({ status: TaskStatus.CLOSED, dueDate: past() })).toBe('CLOSED');
  });

  it('dueDate 為 ISO 字串時同樣判定', () => {
    expect(
      getTaskLockReason({ status: TaskStatus.ACTIVE, dueDate: past().toISOString() })
    ).toBe('DUE_PASSED');
  });
});
