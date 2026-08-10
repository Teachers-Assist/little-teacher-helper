'use client';

import { Button } from '@/components/ui/Button';
import { useMessages } from '@/i18n/MessagesProvider';

/**
 * 離線後備頁的出口（2026-08-05）：改為「重新整理再試試」重試鈕。
 *
 * 舊版唯一出口是 `<Link href="/join">`，但 /join 線上限定、離線進不去 → 死路。
 * 重試鈕呼叫 location.reload()：連線恢復即回到原頁；仍離線則 Service Worker 會再服務
 * 快取頁 / 區段外殼（見 public/sw.js），不再把使用者推去進不了的 /join。
 */
export function RetryButton() {
  const messages = useMessages();
  return (
    <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
      {messages.common.retry}
    </Button>
  );
}

export default RetryButton;
