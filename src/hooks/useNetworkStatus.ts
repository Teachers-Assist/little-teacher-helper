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

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setStatus({
      isOnline: navigator.onLine,
      wasOffline: false,
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
}

export default useNetworkStatus;

