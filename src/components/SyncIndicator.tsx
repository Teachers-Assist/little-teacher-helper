'use client';

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface SyncIndicatorProps {
  className?: string;
}

export function SyncIndicator({ className }: SyncIndicatorProps) {
  const { pendingCount, isSyncing, lastSyncTime, isOnline, sync } = useOfflineSync();

  if (pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-2',
        className
      )}
    >
      {isSyncing ? (
        <>
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            同步中...
          </span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {pendingCount} 筆待同步
          </span>
          {isOnline && (
            <Button variant="ghost" size="sm" onClick={sync} className="ml-auto">
              立即同步
            </Button>
          )}
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            已同步
            {lastSyncTime && (
              <span className="text-xs text-slate-400 ml-1">
                ({lastSyncTime.toLocaleTimeString('zh-TW')})
              </span>
            )}
          </span>
        </>
      )}
    </div>
  );
}

export default SyncIndicator;

