'use client';

import { useSyncExternalStore } from 'react';
import { locales, setLocaleCookie, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

const LABELS: Record<Locale, string> = {
  'zh-TW': '中文',
  en: 'EN',
};

// 以外部 store 的方式從 <html lang> 讀取目前語言（SSR-safe），
// 沿用專案其他地方的慣例（例如 TeacherSidebar）。
const emptySubscribe = (): (() => void) => () => {};
const getActiveLang = (): string => document.documentElement.lang;
const getServerLang = (): string => '';

/**
 * 手動語言切換。寫入 `locale` cookie（保存一年）後重新整理，讓 server 以選定的
 * 字典重新渲染。之後的造訪，cookie 會優先於瀏覽器的 Accept-Language
 * （見 i18n/locale.ts）。
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const lang = useSyncExternalStore(emptySubscribe, getActiveLang, getServerLang);
  const active = locales.find((l) => l === lang) ?? null;

  const choose = (locale: Locale) => {
    setLocaleCookie(locale);
    location.reload();
  };

  return (
    <div className={cn('inline-flex gap-1', className)} role="group" aria-label="Language">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => choose(locale)}
          aria-pressed={active === locale}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            active === locale
              ? 'bg-primary-600 text-white'
              : 'text-slate-500 hover:bg-slate-100'
          )}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
