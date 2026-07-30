/**
 * 網站的正式對外網址（絕對、無結尾斜線）。
 * 供 SEO 用途共用：layout 的 metadataBase、首頁 canonical、sitemap.ts、robots.ts。
 *
 * 來源為 build 時的 `NEXT_PUBLIC_APP_URL`（Next 會把 NEXT_PUBLIC_ 前綴的變數在 build 期
 * 內聯，因此正式網域必須在「打包當下」的環境就設好，不是 runtime 才讀）。同一個變數也用
 * 於 QRCode 產生，所以把它設成正式網域會一起修正分享連結與 QRCode。
 *
 * 目前 repo 的 .env.local / .env.example 都是 http://localhost:3000；正式部署（Cloudflare
 * OpenNext build）務必於 build 環境覆寫成正式網域，否則退回 PRODUCTION_URL。
 */
export const PRODUCTION_URL = 'https://little-teacher-helper.app';

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const url = raw && raw.length > 0 ? raw : PRODUCTION_URL;
  return url.replace(/\/+$/, ''); // 去尾斜線，避免組出 `//sitemap.xml` 之類的重複斜線
}
