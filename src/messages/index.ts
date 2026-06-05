// 字典登錄表。元件／頁面不應再 import 固定語言的檔案（例如 '@/messages/zh-TW'），
// 改用以下方式取得：
//   - Client 元件：const messages = useMessages()（@/i18n/MessagesProvider）
//   - Server 元件：const messages = getMessages(await getLocale())
import { messages as zhTW } from './zh-TW';
import { messages as en } from './en';
import { defaultLocale, type Locale } from '@/i18n/config';

// Widen() 會把 zh-TW 的 `as const` 字面量型別（如 '載入中...'）放寬成基礎型別
// （string），同時保留函式簽章。用它定義 Messages，兩份字典就不會因為譯文不同而
// 無法賦值；而下方的 Record<Locale, Messages> 賦值同時兼作「一致性守門」：
// 只要 `en` 漏了 key 或結構／參數型別不符，build 就會失敗。
type Widen<T> =
  T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T extends string
        ? string
        : T extends number
          ? number
          : T extends boolean
            ? boolean
            : T;

// zh-TW 是 key 結構與參數型別的真實來源。
export type Messages = Widen<typeof zhTW>;

const dictionaries: Record<Locale, Messages> = {
  'zh-TW': zhTW,
  en,
};

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
