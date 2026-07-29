import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

// /robots.txt（Next.js 內建檔案慣例）。只開放行銷首頁；老師/小老師的操作頁與 API
// 非公開內容。特別是 /teacher?tid=... 的還原連結屬永久 bearer token，務必不被索引或跟隨。
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/teacher', '/join', '/helper', '/api'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
