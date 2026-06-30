'use client';

import { useCallback } from 'react';

/**
 * 封裝 Vibration API（003 T203）。
 *
 * 給自我聲明印章等需要觸覺回饋的場景共用。裝置不支援 `navigator.vibrate`
 * （多數桌機、部分平板）時為 noop，呼叫端不需自行判斷。
 *
 * @returns `vibrate(pattern)` — pattern 預設 30ms 短震；可傳陣列做節奏。
 */
export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[] = 30) => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }
    try {
      navigator.vibrate(pattern);
    } catch {
      // 某些瀏覽器在非使用者手勢情境會丟錯，靜默忽略
    }
  }, []);

  return { vibrate };
}

export default useHaptic;
