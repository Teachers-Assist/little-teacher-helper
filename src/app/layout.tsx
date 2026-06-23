import type { Metadata, Viewport } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import '@/styles/globals.css';
import { ToastProvider } from '@/components/ui';
import { getLocale } from '@/i18n/locale';
import { getMessages } from '@/messages';
import { MessagesProvider } from '@/i18n/MessagesProvider';

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
  const messages = getMessages(await getLocale());
  return {
    title: messages.app.name,
    description: messages.app.description,
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: messages.app.name,
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: '/icons/icon.svg',
      apple: '/icons/icon.svg',
    },
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
        <MessagesProvider locale={locale}>
          <ToastProvider>
            <main className="flex min-h-screen flex-col">{children}</main>
          </ToastProvider>
        </MessagesProvider>
      </body>
    </html>
  );
}
