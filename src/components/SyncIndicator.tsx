'use client';

import { useSyncStatus } from '@/lib/offline/store';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { messages } from '@/messages/zh-TW';

interface SyncIndicatorProps {
  className?: string;
}

export function SyncIndicator({ className }: SyncIndicatorProps) {
  const { pendingCount, isSyncing, lastSyncTime, isOnline, sync } = useSyncStatus();

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
            {messages.sync.syncing}
          </span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {messages.sync.pending(pendingCount)}
          </span>
          {isOnline && (
            <Button variant="ghost" size="sm" onClick={sync} className="ml-auto">
              {messages.sync.syncNow}
            </Button>
          )}
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {messages.sync.synced}
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

