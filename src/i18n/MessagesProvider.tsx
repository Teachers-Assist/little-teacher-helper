'use client';

import { createContext, useContext } from 'react';
import { getMessages, type Messages } from '@/messages';
import type { Locale } from './config';

const MessagesContext = createContext<Messages | null>(null);

/**
 * 由 root layout（Server Component）在每個請求注入一次。因為解析出的 `locale`
 * 是以 prop 形式跨越 server→client 邊界，SSR 產出的 HTML 已經是正確語言——
 * 不會閃爍、不會 hydration mismatch，而且這個值是請求作用域的
 * （不像 module 全域變數那樣會跨使用者共用）。
 */
export function MessagesProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <MessagesContext.Provider value={getMessages(locale)}>{children}</MessagesContext.Provider>
  );
}

export function useMessages(): Messages {
  const ctx = useContext(MessagesContext);
  if (!ctx) {
    throw new Error('useMessages 必須在 <MessagesProvider> 內使用');
  }
  return ctx;
}
