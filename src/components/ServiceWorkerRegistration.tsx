'use client';

import { useEffect } from 'react';

/**
 * 註冊 /sw.js（見 public/sw.js）。掛在 root layout，讓全站——尤其小老師登記頁——
 * 斷網重整時仍能由 SW 快取端出頁面外殼，再由 React 讀 localStorage 還原登記資料。
 *
 * 僅在 production 註冊：dev（next dev + Turbopack）的 chunk 會頻繁變動，cache-first
 * 會干擾 HMR。process.env.NODE_ENV 由 Next 於建置時內聯，故此判斷在瀏覽器端也成立。
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    };

    // 等頁面載入完成再註冊，避免與首屏資源競爭頻寬。
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
