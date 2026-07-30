import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

// /sitemap.xml（Next.js 內建檔案慣例）。目前唯一的公開可索引頁面是行銷首頁；
// 老師/小老師流程皆為需代碼或還原連結的私有狀態頁，刻意不列入。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${getSiteUrl()}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
