'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <div className="mb-4 text-6xl">📚</div>
        <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-white">小老師助手</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          讓收回條和登記作業變得更簡單
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid w-full max-w-2xl gap-6 md:grid-cols-2">
        {/* Teacher Card */}
        <Card className="group relative overflow-hidden transition-all hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-blue-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative p-8 text-center">
            <div className="mb-4 text-5xl">👨‍🏫</div>
            <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
              我是老師
            </h2>
            <p className="mb-6 text-slate-600 dark:text-slate-300">
              建立班級房間、管理學生名單、查看繳交報表
            </p>
            <Link href="/teacher">
              <Button variant="primary" size="lg" className="w-full">
                進入老師面板
              </Button>
            </Link>
          </div>
        </Card>

        {/* Helper Card */}
        <Card className="group relative overflow-hidden transition-all hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative p-8 text-center">
            <div className="mb-4 text-5xl">🙋</div>
            <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
              我是小老師
            </h2>
            <p className="mb-6 text-slate-600 dark:text-slate-300">
              掃描 QRCode 加入房間、幫忙登記繳交狀況
            </p>
            <Link href="/join">
              <Button variant="secondary" size="lg" className="w-full">
                掃碼加入房間
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Features Section */}
      <div className="mt-16 grid w-full max-w-4xl gap-8 md:grid-cols-3">
        <FeatureItem
          icon="⚡"
          title="快速登記"
          description="一鍵勾選，即時更新繳交狀態"
        />
        <FeatureItem
          icon="📱"
          title="離線支援"
          description="無網路時也能繼續使用，自動同步"
        />
        <FeatureItem
          icon="📊"
          title="清晰報表"
          description="一目了然的繳交統計，方便追蹤"
        />
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-2 text-3xl">{icon}</div>
      <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

