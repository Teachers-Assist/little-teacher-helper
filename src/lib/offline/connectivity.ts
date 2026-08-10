/**
 * 探測與伺服器的「實際」連線能力（2026-08-05）。
 *
 * 為何不用 `navigator.onLine`：它只反映「裝置有沒有網路介面」。實測發現 —— DevTools 的
 * Network Offline、以及「連了 WiFi 但連不到網（lie-fi）」—— `navigator.onLine` 都仍回報 `true`，
 * 對應的 `offline` 事件也不會觸發。若用它來 gate 換座號，lie-fi 下會誤判為線上 → `clearRoom`
 * 清掉本機班級後 `/join` 又連不到伺服器 → 學生資料清空且卡死。
 *
 * 這裡改為實際打一個 `/api` 路徑：Service Worker 不介入 `/api`（見 public/sw.js），因此離線 /
 * lie-fi 時這個 fetch 會 reject；只要能收到「任何」HTTP 回應（含 404）就代表連得到伺服器。
 * 打不存在的路徑 → 伺服器回 404（快、無 DB 查詢），仍代表可連線。
 */
export async function isServerReachable(timeoutMs = 3500): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch('/api/_connectivity', { method: 'HEAD', cache: 'no-store', signal: controller.signal });
    return true; // 任何回應（含 404）都代表連得到伺服器
  } catch {
    return false; // 網路錯誤 / 逾時 → 視為離線
  } finally {
    clearTimeout(timer);
  }
}
