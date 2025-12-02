import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ToastProvider } from '@/components/ui';

export const metadata: Metadata = {
  title: '小老師助手',
  description: '讓小老師幫忙收回條和登記作業繳交狀況的 PWA 應用程式',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '小老師助手',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-800">
        <ToastProvider>
          <main className="flex min-h-screen flex-col">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
