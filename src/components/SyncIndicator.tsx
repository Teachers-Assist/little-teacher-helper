'use client';

import { useSyncStatus } from '@/lib/offline/store';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';
import { resolveError } from '@/i18n/resolveError';

interface SyncIndicatorProps {
  className?: string;
}

export function SyncIndicator({ className }: SyncIndicatorProps) {
  const messages = useMessages();
  const { pendingCount, failedCount, failReason, isSyncing, lastSyncTime, isOnline, sync } =
    useSyncStatus();

  if (pendingCount === 0 && !isSyncing) {
    return null;
  }

  // 失敗態優先（US1 FR-081）：有送不出去的登記時，蓋過「同步中 / 待上傳」，指向找老師。
  // 資料仍在佇列（未消失），重整會再試一次（S11）。
  //
  // 成因已知時說成因（FR-112a）——「你好像不在這個班級了」對學生的行動指引，遠比
  // 「有 N 筆送不出去」精確；成因不明（重試耗盡）才退回帶筆數的泛用文案。
  if (failedCount > 0 && !isSyncing) {
    const text = failReason
      ? resolveError(messages, failReason)
      : messages.sync.failed(failedCount);
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2',
          className
        )}
      >
        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
        <span className="text-sm text-red-700 dark:text-red-300">{text}</span>
      </div>
    );
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

