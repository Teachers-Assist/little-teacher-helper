'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { messages } from '@/messages/zh-TW';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 bg-amber-50">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600">
          <Icon name="lucide:book-open" size={32} className="text-white" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">{messages.app.name}</h1>
        <p className="text-slate-500">{messages.landing.tagline}</p>
      </div>

      {/* Role Selection */}
      <div className="grid w-full max-w-sm gap-4 sm:max-w-xl sm:grid-cols-2">
        <div className="card text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
            <Icon name="lucide:graduation-cap" size={24} className="text-primary-600" />
          </div>
          <h2 className="mb-1.5 text-lg font-semibold text-slate-900">{messages.landing.teacherTitle}</h2>
          <p className="mb-5 text-sm text-slate-500">{messages.landing.teacherDesc}</p>
          <Link href="/teacher">
            <Button variant="primary" className="w-full">{messages.landing.teacherCta}</Button>
          </Link>
        </div>

        <div className="card text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Icon name="lucide:hand" size={24} className="text-emerald-600" />
          </div>
          <h2 className="mb-1.5 text-lg font-semibold text-slate-900">{messages.landing.helperTitle}</h2>
          <p className="mb-5 text-sm text-slate-500">{messages.landing.helperDesc}</p>
          <Link href="/join">
            <Button variant="secondary" className="w-full">{messages.landing.helperCta}</Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-3 sm:max-w-xl">
        <FeatureItem name="lucide:zap"         title={messages.landing.featureFastTitle}    description={messages.landing.featureFastDesc}    />
        <FeatureItem name="lucide:wifi-off"    title={messages.landing.featureOfflineTitle} description={messages.landing.featureOfflineDesc} />
        <FeatureItem name="lucide:bar-chart-2" title={messages.landing.featureReportTitle}  description={messages.landing.featureReportDesc}  />
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
