import { describe, it, expect } from 'vitest';

// 驗證測試工具本身可運作（S0）。真正的邏輯測試從 Batch A 起加入。
describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
