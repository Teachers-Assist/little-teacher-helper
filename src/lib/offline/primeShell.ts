/**
 * 離線文件預熱（2026-08-05）：連線時請 Service Worker 先把指定 helper 網址的 SSR 文件
 * 存進快取，供離線硬重整 / 硬導覽（或 client 切頁 RSC 失敗退化成整頁導覽時）命中「為該
 * 網址本身產生」的正確文件，避免 App Router 因文件與網址不符而重抓 RSC。見 `public/sw.js`
 * 的 X-SW-Prime 分支。
 *
 * 純副作用、失敗即忽略（best-effort）：離線 / 無 SW / fetch 失敗都不影響畫面。
 */
export function primeOfflineDocs(paths: string[]): void {
  if (typeof navigator === 'undefined' || !navigator.onLine) return;
  if (!('serviceWorker' in navigator)) return;
  for (const path of paths) {
    fetch(path, { headers: { 'X-SW-Prime': '1' }, cache: 'no-store' }).catch(() => {
      // best-effort：預熱失敗不影響使用，離線時本來就會走 localStorage
    });
  }
}
