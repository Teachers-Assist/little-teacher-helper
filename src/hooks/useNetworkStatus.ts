'use client';

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
  });

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline,
    }));
  }, []);

  const handleOffline = useCallback(() => {
    setStatus({
      isOnline: false,
      wasOffline: false,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 掛載後校正一次：頁面可能在「離線狀態下載入」（整頁導覽 / 重整），此時初始 state 仍是 SSR 的
    // online，且之後不會再有 offline 事件觸發 → 必須主動同步真實的 navigator.onLine，否則離線載入的
    // 頁面會誤以為在線上（例如換座號離線 gate 會失效）。
    setStatus((prev) =>
      prev.isOnline === navigator.onLine ? prev : { isOnline: navigator.onLine, wasOffline: false }
    );

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
}

export default useNetworkStatus;

