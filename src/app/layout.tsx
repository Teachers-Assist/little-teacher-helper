import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ToastProvider } from '@/components/ui';
import { messages } from '@/messages/zh-TW';

export const metadata: Metadata = {
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
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
      <body className="min-h-screen bg-amber-50 text-slate-900">
        <ToastProvider>
          <main className="flex min-h-screen flex-col">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
