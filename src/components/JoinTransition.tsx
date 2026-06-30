'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useMessages } from '@/i18n/MessagesProvider';

interface JoinTransitionProps {
  roomName: string;
  /** 過場結束（1.5–2 秒）後自動觸發，進入選座號 */
  onComplete: () => void;
}

/**
 * 進房間過場（003 US2 / FR-066-067）。
 *
 * 慶祝 icon + **大字班級名稱（畫面最醒目元素）**，停 ~1.8 秒後自動進入選座號，
 * **不提供跳過 / 進入按鈕**（避免下意識點過、失去儀式感）。
 */
export function JoinTransition({ roomName, onComplete }: JoinTransitionProps) {
  const messages = useMessages();
  // 用 ref 取最新 onComplete，計時器只在掛載時設一次、卸載即清除（Edge Case 防卡）
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = setTimeout(() => onCompleteRef.current(), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-amber-50 px-6 text-center">
      <div className="animate-pop-in flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-black bg-accent-300">
        <Icon name="lucide:party-popper" size={40} className="text-slate-900" />
      </div>
      <h1 className="animate-pop-in text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
        {roomName}
      </h1>
      <p className="text-base font-medium text-slate-500">{messages.join.joinSuccess}</p>
    </div>
  );
}

export default JoinTransition;
