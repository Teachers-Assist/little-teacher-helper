// 006 推廣示範沙盒——跨視窗同步頻道（T604）。
//
// 老師端 ↔ 小老師端（新視窗 / 新分頁）以同源 BroadcastChannel 傳遞登記變更。
// **不經網路、不碰 D1**；「同步需要網路」的效果由 store 用 navigator.onLine gate 出來
// （spec §1.3 / Assumptions）。`window.open` 的新視窗其 sessionStorage 是複製非共享，
// 故兩端狀態同步必須靠本頻道，不可假設 sessionStorage 互通。
//
// 頻道名帶 sessionId 以隔離多分頁（老師視窗開窗時產生、經 URL 傳給小老師端視窗）。

import type { OfflineRecordEntry } from '@/types';
import type { DemoHandler } from './seed';

export interface DemoSyncMessage {
  type: 'RECORDS_SYNCED';
  taskId: string;
  /** 該任務受影響的 records（studentId → entry；null 表示刪除該筆）。 */
  records: { [studentId: string]: OfflineRecordEntry | null };
  /** 受影響學生的最新經手鏈（studentId → 依序處理者；[] 表示該筆已刪除）——供老師端呈現多人經手。 */
  handlers: { [studentId: string]: DemoHandler[] };
}

export interface DemoChannel {
  post: (msg: DemoSyncMessage) => void;
  close: () => void;
}

const PREFIX = 'lth-demo-sync';

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'BroadcastChannel' in window;
}

/**
 * 建立 demo 同步頻道。不支援 BroadcastChannel 的環境（如 iOS Safari < 15.4）回傳無操作殼，
 * 功能退化（跨視窗即時同步失效）但不崩（spec §1.3 feature-detect）。
 */
export function createDemoChannel(
  sessionId: string,
  onMessage?: (msg: DemoSyncMessage) => void
): DemoChannel {
  if (!isSupported()) {
    return { post: () => {}, close: () => {} };
  }
  const bc = new BroadcastChannel(`${PREFIX}:${sessionId}`);
  if (onMessage) {
    bc.onmessage = (e: MessageEvent<DemoSyncMessage>) => onMessage(e.data);
  }
  return {
    post: (msg) => bc.postMessage(msg),
    close: () => bc.close(),
  };
}
