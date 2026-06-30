'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/i18n/MessagesProvider';
import { useHaptic } from '@/hooks/useHaptic';

interface IdentityStampProps {
  seatNumber: number;
  studentName: string;
  /** 印章停滿 1.5 秒後自動觸發，進入任務清單 */
  onComplete: () => void;
}

/**
 * 自我聲明印章（003 US2 / FR-068-069）—— vision 第 7 節「承諾裝置」核心觸發點。
 *
 * 全螢幕亮出「我是 [座號] 號 [姓名]」停 1.5 秒，搭配輕量短促音效（裝置靜音時自然
 * 無聲）+ haptic 短震，用視覺事實讓自我聲明具有問責重量。**點擊不可跳過**。
 */
export function IdentityStamp({ seatNumber, studentName, onComplete }: IdentityStampProps) {
  const messages = useMessages();
  const { vibrate } = useHaptic();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // 音效：autoplay 已通過「選座號」手勢要求；裝置靜音時瀏覽器自然不出聲。
    // 音檔尚未放入時 play() 會 reject，包 catch 靜默處理（FR-069）。
    try {
      void new Audio('/sounds/stamp.mp3').play().catch(() => {});
    } catch {
      // 建立 Audio 失敗（極少數環境）忽略
    }
    vibrate(30);

    const timer = setTimeout(() => onCompleteRef.current(), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // 點擊不接 onClick → 不可跳過（FR-068）
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-600 px-6">
      <div className="animate-stamp-in rounded-2xl border-4 border-white px-10 py-8 text-center">
        <p className="text-3xl font-extrabold leading-snug text-white sm:text-4xl">
          {messages.join.identityStamp(seatNumber, studentName)}
        </p>
      </div>
    </div>
  );
}

export default IdentityStamp;
