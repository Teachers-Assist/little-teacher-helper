'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center">
        <div className="mb-4 text-8xl">😵</div>
        <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-white">出錯了</h1>
        <h2 className="mb-4 text-xl font-semibold text-slate-700 dark:text-slate-300">
          發生了一些問題
        </h2>
        <p className="mb-8 max-w-md text-slate-600 dark:text-slate-400">
          很抱歉，應用程式遇到了一些問題。請嘗試重新載入頁面，或稍後再試。
        </p>
        {error.message && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-left">
            <p className="text-sm font-mono text-red-600 dark:text-red-400">{error.message}</p>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="primary" onClick={() => reset()}>
            重試
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            回到首頁
          </Button>
        </div>
      </div>
    </div>
  );
}

