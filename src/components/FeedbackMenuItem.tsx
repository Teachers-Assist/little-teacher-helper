'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useMessages } from '@/i18n/MessagesProvider';
import { collectFeedbackContext, openFeedbackForm } from '@/lib/feedback';

interface FeedbackMenuItemProps {
  /** 點下去之後要不要順便關掉外層選單 */
  onDone?: () => void;
}

/**
 * 設定選單裡的「回報問題」。點下去會開一個已經預填好情境的 Google 表單。
 *
 * 只放在老師端（SettingsMenu 的 sidebar variant）。小老師端刻意不放——
 * 依 vision §4，學生遇到問題該做的事是「去找老師」，而不是自己填一份表單。
 * （這也是 feedback.ts 不預填 [B2] 裝置與 [B5] 同步狀態的原因：那兩欄的
 *  真實答案都在學生手上那台裝置，這裡測到的一定是老師這台。）
 *
 * 整個流程是同步的：沒有 await，所以 window.open 一定在使用者手勢裡，不會被當彈出視窗擋掉。
 */
export function FeedbackMenuItem({ onDone }: FeedbackMenuItemProps) {
  const messages = useMessages();
  const pathname = usePathname();

  const handleClick = () => {
    openFeedbackForm(collectFeedbackContext(pathname));
    onDone?.();
  };

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
    >
      <Icon name="lucide:message-square-warning" size={14} className="shrink-0 text-slate-400" />
      {messages.feedback.menuLabel}
    </button>
  );
}

export default FeedbackMenuItem;
