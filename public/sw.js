/* Little Teacher Helper — Service Worker
 *
 * 目的：讓已造訪過的頁面（尤其小老師登記頁）在斷網後重新整理仍能載入，
 * 由 React 啟動後讀 localStorage 還原「登記到一半」的資料，而不是顯示
 * 瀏覽器的斷網（恐龍）畫面。
 *
 * 策略：
 *   - 導覽請求（開啟／重整頁面）：network-first → 該網址快取 → /offline 後備。
 *     線上時永遠取最新頁面並順手快取；斷網時退回上次快取的同一網址。
 *   - 靜態資源（/_next/static、/icons、字型、圖片）：cache-first。
 *     這些是內容雜湊、不可變的檔案，命中即用、未命中才抓並存起來。
 *   - /api 及其他：不介入，交給瀏覽器與 App 既有離線邏輯處理
 *     （斷線時 fetch 失敗，登記頁改用 localStorage 快取資料）。
 *
 * 維護：更新本檔內容時請 bump CACHE_VERSION，activate 會清掉舊版快取。
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `lth-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// 安裝時預先快取的最小集合：離線後備頁與 manifest。
const PRECACHE_URLS = [OFFLINE_URL, '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      // 新版 SW 立即接管，不等舊分頁全部關閉。
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 清掉非目前版本的舊快取。
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
  // 只處理同源請求；跨源（CDN、外部）交給瀏覽器預設處理。
  if (url.origin !== self.location.origin) return;

  // 不介入 API：斷線時讓它自然失敗，登記頁會改用 localStorage 快取資料。
  if (url.pathname.startsWith('/api/')) return;

  // 導覽（開啟／重整頁面）：network-first，斷網退回該網址快取，再退回離線後備頁。
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  // 靜態資源：cache-first（命中即用，未命中才抓並存起來）。
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
          // 斷網且無快取 → 回一個錯誤 Response，交給瀏覽器處理。
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 其餘 GET：維持預設網路行為。
});
