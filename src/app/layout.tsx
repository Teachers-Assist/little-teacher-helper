import type { Metadata, Viewport } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import '@/styles/globals.css';
import { ToastProvider } from '@/components/ui';
import { getLocale } from '@/i18n/locale';
import { getMessages } from '@/messages';
import { MessagesProvider } from '@/i18n/MessagesProvider';
import { getSiteUrl } from '@/lib/site';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

// Self-hosted via next/font (no runtime Google Fonts request). Exposes the
// `--font-noto-sans` CSS variable consumed by the Tailwind `--font-sans` token.
// `preload: false` is required for large CJK fonts that have no small subset.
const notoSansTC = Noto_Sans_TC({
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-noto-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const { app, seo } = messages;

  // metadataBase 讓相對路徑（OG 圖、canonical）解析成絕對網址。
  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: app.name,
    // default 是各頁的品牌分頁標題；template 讓有自訂標題的子頁自動補上品牌後綴。
    // 首頁另在 app/page.tsx 以 absolute 覆寫為關鍵字化標題。
    title: { default: app.name, template: `%s · ${app.name}` },
    description: seo.description,
    keywords: seo.keywords,
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: app.name,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: '/icons/favicon.png',
      apple: '/icons/favicon.png',
    },
    openGraph: {
      type: 'website',
      siteName: app.name,
      title: seo.title,
      description: seo.description,
      locale: locale === 'zh-TW' ? 'zh_TW' : 'en_US',
      images: [
        {
          url: '/icons/ig_1080.png',
          width: 1080,
          height: 1080,
          alt: seo.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: ['/icons/ig_1080.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
      },
    },
    category: 'education',
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={notoSansTC.variable}>
      <body className="min-h-screen bg-amber-50 text-slate-900">
        <ServiceWorkerRegistration />
        <MessagesProvider locale={locale}>
          <ToastProvider>
            <main className="flex min-h-screen flex-col">{children}</main>
          </ToastProvider>
        </MessagesProvider>
      </body>
    </html>
  );
}
