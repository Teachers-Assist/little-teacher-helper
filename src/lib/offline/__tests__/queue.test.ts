import { describe, it, expect } from 'vitest';
import { nextSyncOp } from '../queue';
import { OfflineSyncQueueItem, UpdateRecordInput } from '@/types';

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
