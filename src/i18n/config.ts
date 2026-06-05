// 支援的介面語言。zh-TW 為字典的真實來源（見 src/messages）。
export const locales = ['zh-TW', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-TW';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

// Cookie 名稱放在這裡（而非 locale.ts），讓 client 端程式可以引用它，
// 而不必 import 會帶入 server 專用 `next/headers` 的 locale.ts。
export const LOCALE_COOKIE = 'locale';

/** 將選定的語言寫入 cookie，保存一年（client 端使用）。 */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
