'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 bg-[#f8f7ff]">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600">
          <Icon name="lucide:book-open" size={32} className="text-white" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">小老師助手</h1>
        <p className="text-slate-500">讓收回條和登記作業變得更簡單</p>
      </div>

      {/* Role Selection */}
      <div className="grid w-full max-w-sm gap-4 sm:max-w-xl sm:grid-cols-2">
        <div className="card text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
            <Icon name="lucide:graduation-cap" size={24} className="text-primary-600" />
          </div>
          <h2 className="mb-1.5 text-lg font-semibold text-slate-900">我是老師</h2>
          <p className="mb-5 text-sm text-slate-500">建立班級房間、管理學生名單、查看繳交報表</p>
          <Link href="/teacher">
            <Button variant="primary" className="w-full">進入老師面板</Button>
          </Link>
        </div>

        <div className="card text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Icon name="lucide:hand" size={24} className="text-emerald-600" />
          </div>
          <h2 className="mb-1.5 text-lg font-semibold text-slate-900">我是小老師</h2>
          <p className="mb-5 text-sm text-slate-500">掃描 QRCode 加入房間、幫忙登記繳交狀況</p>
          <Link href="/join">
            <Button variant="secondary" className="w-full">掃碼加入房間</Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-3 sm:max-w-xl">
        <FeatureItem name="lucide:zap"         title="快速登記" description="一鍵勾選即時更新" />
        <FeatureItem name="lucide:wifi-off"    title="離線支援" description="無網路也能使用"   />
        <FeatureItem name="lucide:bar-chart-2" title="清晰報表" description="一目了然的統計"   />
      </div>
    </div>
  );
}

function FeatureItem({ name, title, description }: { name: string; title: string; description: string }) {
  return (
    <div className="card text-center !p-4">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
        <Icon name={name} size={17} className="text-primary-600" />
      </div>
      <h3 className="mb-0.5 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}
