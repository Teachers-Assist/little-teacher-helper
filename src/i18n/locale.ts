// Server 專用的語言偵測。優先順序：
//   1. `locale` cookie（使用者手動切換語言時寫入）
//   2. 瀏覽器的 Accept-Language 標頭
//   3. defaultLocale 預設語言
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config';

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get('accept-language') ?? '';
  return matchAcceptLanguage(accept);
}

// 解析如 "zh-TW,zh;q=0.9,en;q=0.8" 的字串，回傳第一個我們支援的語言。
export function matchAcceptLanguage(header: string): Locale {
  const wanted = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q ? Number.parseFloat(q) : 1 };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    const exact = locales.find((l) => l.toLowerCase() === tag);
    if (exact) return exact;

    const base = tag.split('-')[0];
    if (base === 'zh') return 'zh-TW';
    if (base === 'en') return 'en';
  }
  return defaultLocale;
}
