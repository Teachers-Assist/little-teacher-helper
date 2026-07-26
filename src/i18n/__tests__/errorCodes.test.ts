import { describe, it, expect } from 'vitest';
import { ERROR_CODES, NON_RETRYABLE_ERROR_CODES } from '../errorCodes';
import { resolveError } from '../resolveError';
import { messages as zhTW } from '@/messages/zh-TW';

describe('resolveError（碼值 → 文案）', () => {
  it('新增的同步衝突碼各自解析到對應文案', () => {
    expect(resolveError(zhTW, ERROR_CODES.TASK_LOCKED)).toBe(zhTW.sync.taskLocked);
    expect(resolveError(zhTW, ERROR_CODES.TASK_NOT_FOUND)).toBe(zhTW.sync.taskNotFound);
    expect(resolveError(zhTW, ERROR_CODES.STUDENT_NOT_IN_ROOM)).toBe(zhTW.sync.studentRemoved);
    expect(resolveError(zhTW, ERROR_CODES.RECORD_VALIDATION_FAILED)).toBe(zhTW.record.saveFailed);
  });

  it('未知碼與非字串退回通用錯誤文案（畫面不會壞）', () => {
    expect(resolveError(zhTW, 'nope.not.a.code')).toBe(zhTW.common.error);
    expect(resolveError(zhTW, undefined)).toBe(zhTW.common.error);
    expect(resolveError(zhTW, 42)).toBe(zhTW.common.error);
  });
});

describe('NON_RETRYABLE_ERROR_CODES（FR-078 分類）', () => {
  it('鎖定 / 不存在 / 已移除 / 驗證失敗屬不可重試', () => {
    expect(NON_RETRYABLE_ERROR_CODES.has(ERROR_CODES.TASK_LOCKED)).toBe(true);
    expect(NON_RETRYABLE_ERROR_CODES.has(ERROR_CODES.TASK_NOT_FOUND)).toBe(true);
    expect(NON_RETRYABLE_ERROR_CODES.has(ERROR_CODES.STUDENT_NOT_IN_ROOM)).toBe(true);
    expect(NON_RETRYABLE_ERROR_CODES.has(ERROR_CODES.RECORD_VALIDATION_FAILED)).toBe(true);
  });

  it('通用 500 不屬不可重試（可再試）', () => {
    expect(NON_RETRYABLE_ERROR_CODES.has(ERROR_CODES.INTERNAL_ERROR)).toBe(false);
  });
});
