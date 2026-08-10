/* Little Teacher Helper — Service Worker
 *
 * 目的：讓已造訪過的頁面（尤其小老師登記頁）在斷網後重新整理 / 切頁仍能載入，
 * 由 React 啟動後讀 localStorage 還原「登記到一半」的資料，而不是顯示瀏覽器的
 * 斷網（恐龍）畫面或專案的 /offline 後備頁。
 *
 * 策略：
 *   - 文件預熱（X-SW-Prime）：學生端頁面在「連線時」會主動 fetch 自己（與清單上各任務）
 *     的網址並帶此標頭；SW 收到即把該網址的 SSR 文件存進快取（以 pathname 為鍵）。
 *     這樣離線硬重整 / 硬導覽該網址時，navigate 後備能命中「為該網址本身產生」的文件
 *     （非借用他頁），避免 App Router 因文件與網址不符而重抓 RSC。
 *   - 導覽請求（開啟／重整頁面）：network-first → 該網址快取 → /offline 後備。
 *     學生端 helper 連結在「離線時」改走整頁導覽（見 TaskList / 登記頁 onClick），因此離線的
 *     選任務 / 回列表都是 navigate 請求、由此分支的正確文件接住——不走 App Router client 端 RSC
 *     切頁（後者離線會有「點了沒反應 / 顯示錯頁」的 stale 路由快取問題）。線上仍走 SPA 切頁。
 *   - 靜態資源（/_next/static、/icons、字型、圖片）：cache-first。
 *   - RSC / prefetch / /api / 其餘：不介入，離線自然失敗（不影響使用者；登記頁改讀 localStorage）。
 *
 * 導覽 / 預熱文件的快取比對帶 { ignoreVary: true }：Next 對文件會回 `Vary: RSC, Next-Router-*`，
 * 若照 Vary 比對會使 navigate（無這些標頭）對不上已快取項而誤失。
 *
 * 維護：更新本檔內容時請 bump CACHE_VERSION，activate 會清掉舊版快取。
 */

const CACHE_VERSION = 'v4';
const CACHE_NAME = `lth-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';
const MATCH_OPTS = { ignoreVary: true };

// 安裝時預先快取的最小集合：離線後備頁與 manifest。
const PRECACHE_URLS = [OFFLINE_URL, '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

/** 內容雜湊、可安全 cache-first 的靜態資源。 */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 文件預熱（client 連線時帶 X-SW-Prime 主動打自己的網址）：把 SSR 文件以 pathname 為鍵存起來，
  // 供離線 navigate 後備命中「為此網址本身產生」的正確文件。
  if (request.headers.get('X-SW-Prime') === '1') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(url.pathname, fresh.clone());
          }
          return fresh;
        } catch {
          return Response.error();
        }
      })()
    );
    return;
  }

  // 導覽（開啟／重整頁面）：network-first，斷網退回該網址快取（含預熱文件），再退回離線後備頁。
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const fresh = await fetch(request);
          cache.put(url.pathname, fresh.clone());
          return fresh;
        } catch {
          const cached = await cache.match(url.pathname, MATCH_OPTS);
          return cached || (await caches.match(OFFLINE_URL, MATCH_OPTS));
        }
      })()
    );
    return;
  }

  // 靜態資源：cache-first。
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 其餘 GET（含 prefetch RSC）：維持預設網路行為。
});
