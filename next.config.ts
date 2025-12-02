import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Turbopack config (Next.js 16+)
  turbopack: {},
  // PWA will be configured via Service Worker in production
  // For now, we'll use a simpler approach without next-pwa
};

export default nextConfig;
