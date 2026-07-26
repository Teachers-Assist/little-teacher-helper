import { describe, it, expect } from 'vitest';
import { detectAnomalies, AnomalyInput } from '../anomalyDetection';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// 固定「現在」＝台北 2026-07-27 12:00（= 04:00Z）供規則二測試
const NOW = new Date('2026-07-27T04:00:00.000Z').getTime();

function input(overrides: Partial<AnomalyInput>): AnomalyInput {
  return {
    status: 'ACTIVE',
    isArchived: false,
    dueDate: null,
    createdAt: new Date(NOW - 3 * DAY),
    recordedCount: 0,
    classStudentCount: 30,
    lastRecordActivityAt: null,
    ...overrides,
  };
}

describe('detectAnomalies 規則一（TASK_STALLED，滑動視窗）', () => {
  it('無指定無截止，建立滿 24h 且零登記 → 停擺（涵蓋原本的空格）', () => {
    const r = detectAnomalies(input({ createdAt: new Date(NOW - 25 * HOUR) }), NOW);
    expect(r.some((a) => a.type === 'TASK_STALLED')).toBe(true);
  });

  it('登了幾筆後靜置滿 24h（自最後活動起算）→ 停擺', () => {
    const r = detectAnomalies(
      input({ recordedCount: 3, lastRecordActivityAt: new Date(NOW - 25 * HOUR) }),
      NOW
    );
    expect(r.some((a) => a.type === 'TASK_STALLED')).toBe(true);
  });

  it('最後活動在 24h 內 → 不判', () => {
    const r = detectAnomalies(
      input({ recordedCount: 3, lastRecordActivityAt: new Date(NOW - 2 * HOUR) }),
      NOW
    );
    expect(r.some((a) => a.type === 'TASK_STALLED')).toBe(false);
  });

  it('全班登滿（recordedCount ≥ classStudentCount）→ 不判停擺，即使久未動', () => {
    const r = detectAnomalies(
      input({ recordedCount: 30, classStudentCount: 30, lastRecordActivityAt: new Date(NOW - 5 * DAY) }),
      NOW
    );
    expect(r.some((a) => a.type === 'TASK_STALLED')).toBe(false);
  });

  it('idleMs 反映已停擺時長', () => {
    const r = detectAnomalies(input({ createdAt: new Date(NOW - 30 * HOUR) }), NOW);
    const stalled = r.find((a) => a.type === 'TASK_STALLED');
    expect(stalled?.idleMs).toBeGreaterThanOrEqual(30 * HOUR - 1000);
  });
});

describe('detectAnomalies 規則二（NO_RECORDS_BY_DUE，絕對時鐘 08:00 台北）', () => {
  it('截止日當天、已過 08:00、全班零登記、08:00 前建立 → 判', () => {
    const r = detectAnomalies(
      input({
        dueDate: '2026-07-27', // 台北 07-27 當天，08:00 = 00:00Z；NOW=04:00Z 已過
        createdAt: new Date('2026-07-26T00:00:00.000Z'), // 前一天建立
        recordedCount: 0,
      }),
      NOW
    );
    expect(r.some((a) => a.type === 'NO_RECORDS_BY_DUE')).toBe(true);
  });

  it('尚未到截止日 08:00 → 不判', () => {
    const r = detectAnomalies(
      input({
        dueDate: '2026-07-28', // 明天，其 08:00 = 07-28 00:00Z，NOW 未到
        createdAt: new Date('2026-07-26T00:00:00.000Z'),
        recordedCount: 0,
      }),
      NOW
    );
    expect(r.some((a) => a.type === 'NO_RECORDS_BY_DUE')).toBe(false);
  });

  it('於截止日 08:00 之後才建立 → 不判（避免剛建立就被喬）', () => {
    const r = detectAnomalies(
      input({
        dueDate: '2026-07-27',
        createdAt: new Date('2026-07-27T02:00:00.000Z'), // 台北 10:00，已過當天 08:00
        recordedCount: 0,
      }),
      NOW
    );
    expect(r.some((a) => a.type === 'NO_RECORDS_BY_DUE')).toBe(false);
  });

  it('已有登記（recordedCount > 0）→ 不判規則二', () => {
    const r = detectAnomalies(
      input({ dueDate: '2026-07-27', createdAt: new Date('2026-07-26'), recordedCount: 1 }),
      NOW
    );
    expect(r.some((a) => a.type === 'NO_RECORDS_BY_DUE')).toBe(false);
  });
});

describe('detectAnomalies 共同前提', () => {
  it('已封存 → 不判', () => {
    expect(detectAnomalies(input({ isArchived: true, createdAt: new Date(NOW - 5 * DAY) }), NOW)).toHaveLength(0);
  });
  it('非 ACTIVE（HELPER_COMPLETED）→ 不判（規則三另案）', () => {
    expect(
      detectAnomalies(input({ status: 'HELPER_COMPLETED', createdAt: new Date(NOW - 5 * DAY) }), NOW)
    ).toHaveLength(0);
  });
});
