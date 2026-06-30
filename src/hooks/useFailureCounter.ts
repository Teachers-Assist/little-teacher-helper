'use client';

import { useCallback, useState } from 'react';

interface FailureCounter {
  count: number;
  /** 是否已達到（或超過）升級閾值 */
  hasReachedThreshold: boolean;
  /** 失敗一次，計數 +1 */
  increment: () => void;
  /** 成功後歸零 */
  reset: () => void;
}

/**
 * 頁面層 in-memory 失敗計數（003 FR-065 / NFR-010）。
 *
 * 用於 `/join` 連續輸入錯誤房間碼的情境：累計到 `threshold` 次時，呼叫端可
 * 依 `hasReachedThreshold` 把錯誤訊息升級為「去找老師」。
 *
 * 刻意**不**持久化到 localStorage —— 重新整理頁面即歸零（NFR-010、spec Edge Case）。
 */
export function useFailureCounter(threshold = 3): FailureCounter {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const reset = useCallback(() => setCount(0), []);

  return {
    count,
    hasReachedThreshold: count >= threshold,
    increment,
    reset,
  };
}

export default useFailureCounter;
