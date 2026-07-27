import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Turbopack config (Next.js 16+)
  turbopack: {},
  // PWA will be configured via Service Worker in production
  // For now, we'll use a simpler approach without next-pwa
};

// 註：本可用 initOpenNextCloudflareForDev() 讓 next dev 透過 wrangler 取得本機 D1 綁定，
// 但那會啟動 Cloudflare 的 workerd 執行環境；本機 Windows 上 workerd 無法啟動
// （access violation）。因此改為：本機 dev 由 src/lib/db.ts 自動回退到原生 SQLite，
// 完全不依賴 workerd；線上（Cloudflare Workers）才走 D1。
export default nextConfig;
