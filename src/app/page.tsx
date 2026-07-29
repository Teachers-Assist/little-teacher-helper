import type { Metadata } from 'next';
import { getLocale } from '@/i18n/locale';
import { getMessages } from '@/messages';
import HomePage from './HomePage';

// 首頁專屬 metadata：以 absolute 覆寫 layout 的品牌預設，給關鍵字化的 <title>；
// 並宣告 canonical 指向網站根。其餘 OG / Twitter / description 沿用 layout。
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = getMessages(await getLocale());
  return {
    title: { absolute: seo.title },
    alternates: { canonical: '/' },
  };
}

export default function Page() {
  return <HomePage />;
}
