import type { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';
import { getLocale } from '@/i18n/locale';
import { getMessages } from '@/messages';
import { RetryButton } from './RetryButton';

// 離線後備頁：僅在「頁面從未被快取過、且目前斷網」時由 Service Worker 端出
// （見 public/sw.js 的導覽後備）。已造訪過的頁面會直接命中該網址快取，不會到這裡。
export const metadata: Metadata = { title: '離線' };

export default async function OfflinePage() {
  const messages = getMessages(await getLocale());
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6 text-center">
      <Icon name="lucide:wifi-off" size={40} className="mb-3 text-slate-300" />
      <h1 className="mb-2 text-xl font-bold text-slate-900">{messages.common.offline}</h1>
      <p className="mb-6 max-w-xs text-slate-600">{messages.common.offlineHint}</p>
      <RetryButton />
    </div>
  );
}
