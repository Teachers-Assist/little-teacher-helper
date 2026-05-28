'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

interface NetworkStatusProps {
  className?: string;
  showWhenOnline?: boolean;
}

export function NetworkStatus({ className, showWhenOnline = false }: NetworkStatusProps) {
  const { isOnline } = useNetworkStatus();

  // Don't show when online unless explicitly requested
  if (isOnline && !showWhenOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl px-4 py-3 text-center shadow-lg transition-all',
        isOnline
          ? 'bg-emerald-500 text-white'
          : 'bg-amber-500 text-white',
        className
      )}
    >
      {isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span>已連線</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white" />
          <span>離線模式 - 資料將在連線後同步</span>
        </div>
      )}
    </div>
  );
}

export default NetworkStatus;

