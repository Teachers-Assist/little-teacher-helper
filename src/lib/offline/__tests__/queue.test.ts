import { describe, it, expect } from 'vitest';
import { nextSyncOp, reconcileSync } from '../queue';
import { ERROR_CODES } from '@/i18n/errorCodes';
import { OfflineData, OfflineSyncQueueItem, UpdateRecordInput } from '@/types';

const payload = (gradeValue: number): UpdateRecordInput => ({
  taskId: 't1',
  studentId: 's1',
  gradeValue,
  recorderSeatNumber: 8,
});

describe('nextSyncOp（版本戳）', () => {
  it('新建 op：rev = 0', () => {
    const op = nextSyncOp(undefined, 'UPDATE_RECORD', payload(80), 'now', 'id-1');
    expect(op.id).toBe('id-1');
    expect(op.rev).toBe(0);
    expect(op.retryCount).toBe(0);
  });

  it('就地換 payload：沿用同一 id、rev + 1、retryCount 重置', () => {
    const existing: OfflineSyncQueueItem = {
      id: 'id-1',
      type: 'UPDATE_RECORD',
      payload: payload(80),
      createdAt: 't0',
      retryCount: 2,
      rev: 0,
    };
    const op = nextSyncOp(existing, 'UPDATE_RECORD', payload(88), 'now', 'ignored-new-id');
    expect(op.id).toBe('id-1'); // 沿用同一 id
    expect(op.payload.gradeValue).toBe(88); // 換新值
    expect(op.rev).toBe(1); // 版本 +1
    expect(op.retryCount).toBe(0); // 重置
  });

  it('連續換多次：rev 持續遞增', () => {
    let op = nextSyncOp(undefined, 'UPDATE_RECORD', payload(1), 'now', 'id-1');
    op = nextSyncOp(op, 'UPDATE_RECORD', payload(2), 'now', 'x');
    op = nextSyncOp(op, 'UPDATE_RECORD', payload(3), 'now', 'x');
    expect(op.rev).toBe(2);
    expect(op.payload.gradeValue).toBe(3);
  });
});

// reconcileSync 測試 -------------------------------------------------------

function qop(overrides: Partial<OfflineSyncQueueItem> & { id: string }): OfflineSyncQueueItem {
  return {
    type: 'UPDATE_RECORD',
    payload: { taskId: 't1', studentId: 's1', gradeValue: 88, recorderSeatNumber: 8 },
    createdAt: 'now',
    retryCount: 0,
    rev: 0,
    ...overrides,
  };
}

describe('reconcileSync', () => {
  it('rev 未變被 ack → 沉澱到 base、移出佇列、success++', () => {
    const op = qop({ id: 'a', rev: 0 });
    const records: OfflineData['records'] = {};
    const r = reconcileSync({
      queue: [op],
      records,
      sentRev: { a: 0 },
      acked: new Set(['a']),
      conflicts: [],
      attemptedIds: new Set(['a']),
    });
    expect(r.nextQueue).toHaveLength(0); // 移出
    expect(r.success).toBe(1);
    expect(records.t1.s1.gradeValue).toBe(88); // 沉澱 base
  });

  it('RC-1 臉 A：ack 到達時 rev 已變（飛行期間被改）→ 不 ack、保留待重送', () => {
    // 送出時 rev=0，回應到達前使用者又改成 v2 → 佇列裡 op.rev=1
    const op = qop({ id: 'a', rev: 1, payload: { taskId: 't1', studentId: 's1', gradeValue: 99, recorderSeatNumber: 8 } });
    const records: OfflineData['records'] = {};
    const r = reconcileSync({
      queue: [op],
      records,
      sentRev: { a: 0 }, // 送出當下是 rev 0
      acked: new Set(['a']), // 伺服器說 a 成功（但那是舊值）
      conflicts: [],
      attemptedIds: new Set(['a']),
    });
    expect(r.nextQueue).toHaveLength(1); // 保留
    expect(r.nextQueue[0].payload.gradeValue).toBe(99); // 新值不蒸發
    expect(records.t1).toBeUndefined(); // 未沉澱舊值
  });

  it('不可重試衝突（任務鎖定）→ 標記 nonRetryable、保留不移除', () => {
    const op = qop({ id: 'a' });
    const r = reconcileSync({
      queue: [op],
      records: {},
      sentRev: { a: 0 },
      acked: new Set(),
      conflicts: [{ operationId: 'a', reason: ERROR_CODES.TASK_LOCKED }],
      attemptedIds: new Set(['a']),
    });
    expect(r.nextQueue).toHaveLength(1); // 不靜默移除（INV-1）
    expect(r.nextQueue[0].nonRetryable).toBe(true);
    expect(r.failed).toBe(1);
  });

  it('可重試衝突（500/INTERNAL_ERROR）→ retryCount+1、保留、不標記 nonRetryable', () => {
    const op = qop({ id: 'a', retryCount: 1 });
    const r = reconcileSync({
      queue: [op],
      records: {},
      sentRev: { a: 0 },
      acked: new Set(),
      conflicts: [{ operationId: 'a', reason: ERROR_CODES.INTERNAL_ERROR }],
      attemptedIds: new Set(['a']),
    });
    expect(r.nextQueue[0].retryCount).toBe(2);
    expect(r.nextQueue[0].nonRetryable).toBeUndefined();
  });

  it('送出但回應遺漏（網路中斷）→ retryCount+1、保留', () => {
    const op = qop({ id: 'a', retryCount: 0 });
    const r = reconcileSync({
      queue: [op],
      records: {},
      sentRev: { a: 0 },
      acked: new Set(), // 無 ack
      conflicts: [], // 無衝突
      attemptedIds: new Set(['a']),
    });
    expect(r.nextQueue[0].retryCount).toBe(1);
  });

  it('臉 C：飛行期間新增、本輪未送的 op → 原封保留、不被誤判', () => {
    const sent = qop({ id: 'a', rev: 0 });
    const added = qop({ id: 'b', rev: 0, payload: { taskId: 't1', studentId: 's2', gradeValue: 70, recorderSeatNumber: 8 } });
    const records: OfflineData['records'] = {};
    const r = reconcileSync({
      queue: [sent, added],
      records,
      sentRev: { a: 0 }, // 只送了 a
      acked: new Set(['a']),
      conflicts: [],
      attemptedIds: new Set(['a']),
    });
    // a 被 ack 移出；b（飛行期間新增）保留
    expect(r.nextQueue.map((o) => o.id)).toEqual(['b']);
    expect(records.t1.s1.gradeValue).toBe(88);
  });

  it('delete 意圖的 op 被 ack → 從 base 移除該學生', () => {
    const op = qop({ id: 'a', payload: { taskId: 't1', studentId: 's1', recorderSeatNumber: 8 } }); // 無 grade/submission = 刪除
    const records: OfflineData['records'] = {
      t1: { s1: { recorderSeatNumber: 8, isAssignedRecorder: false, updatedAt: 'x' } },
    };
    reconcileSync({
      queue: [op],
      records,
      sentRev: { a: 0 },
      acked: new Set(['a']),
      conflicts: [],
      attemptedIds: new Set(['a']),
    });
    expect(records.t1.s1).toBeUndefined();
  });
});
