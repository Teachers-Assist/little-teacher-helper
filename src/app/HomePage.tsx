'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useMessages } from '@/i18n/MessagesProvider';
import { buildFeedbackUrl, INTENT } from '@/lib/feedback';

export default function HomePage() {
  const messages = useMessages();
  const { landing, app } = messages;

  // 首頁的入口一律走「功能建議」分流：這裡沒有畫面／班級可以帶，
  // 而會從首頁點進來的多半是想講想法的人。真的要回報問題的老師
  // 在表單第一題就能改選（側欄的「回報問題」才預填 bug 並帶上情境）。
  // 只依賴 build 時注入的版本號，所以在伺服器與瀏覽器算出來一樣，不會 hydration 不一致。
  const ideaFormUrl = buildFeedbackUrl({ intent: INTENT.idea });

  return (
    <div className="mx-auto w-full max-w-[1120px] sm:border-x-2 sm:border-black">
      {/* Top bar */}
      <header className="flex items-center gap-2 border-b-2 border-black bg-white px-4 py-3.5 sm:px-10">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border-2 border-black bg-accent-400">
          <Icon name="lucide:book-open" size={18} className="text-black" />
        </span>
        <span className="text-base font-black text-slate-900">{app.name}</span>
      </header>

      {/* Hero（大字報，壓在黃色色塊上） */}
      <section className="border-b-[3px] border-black bg-accent-400">
        <div className="grid items-center gap-6 px-4 py-6 sm:grid-cols-[1.08fr_0.92fr] sm:gap-9 sm:px-10 sm:py-10">
          <div>
            <span className="mb-3.5 inline-block rounded-full border-2 border-black bg-white px-3 py-1 text-[11px] font-bold text-slate-900 sm:mb-4">
              {landing.heroBadge}
            </span>
            {/* 主標斷行：桌機在 lead 後斷、手機在 mid 後斷（兩個斷點各自對應 br 的顯示斷點） */}
            <h1 className="mb-3 text-[34px] font-black leading-[1.1] tracking-[-0.03em] text-black sm:mb-4 sm:text-[50px] sm:leading-[1.08]">
              {landing.heroTitle.lead}
              <br className="hidden sm:inline" />
              {landing.heroTitle.mid}
              <br className="sm:hidden" />
              {landing.heroTitle.tail}
            </h1>
            <p className="text-sm font-medium leading-relaxed text-slate-800 sm:max-w-[380px] sm:text-base">
              {landing.heroSubtitle}
            </p>
          </div>

          {/* 角色卡（橫向：圖示在左、文字在右） */}
          <div className="flex flex-col gap-4">
            <RoleCard
              iconName="lucide:graduation-cap"
              iconClassName="bg-primary-50 text-primary-600"
              title={landing.teacherTitle}
              description={landing.teacherDesc}
              href="/teacher"
              cta={landing.teacherCta}
              variant="primary"
            />
            <RoleCard
              iconName="lucide:hand"
              iconClassName="bg-emerald-50 text-emerald-600"
              title={landing.helperTitle}
              description={landing.helperDesc}
              href="/join"
              cta={landing.helperCta}
              variant="secondary"
            />

            {/* 次要入口：試用示範沙盒（層級刻意低於兩張角色卡，FR-141） */}
            <Link
              href="/demo"
              className="group flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-primary-600"
            >
              <Icon name="lucide:play-circle" size={15} />
              <span>{landing.tryDemoTitle}</span>
              <span className="font-normal text-slate-500 group-hover:text-primary-500">
                · {landing.tryDemoDesc}
              </span>
            </Link>

            {/* 意見回饋：緊接試用之下，同為一行式次要入口，但用白底黑框（沿用 heroBadge 的
                語彙）壓在黃色底上，比試用醒目、又不與上面兩張角色卡搶主要動線。 */}
            <a
              href={ideaFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="-mt-2 inline-flex items-center justify-center gap-1.5 self-center rounded-full border-2 border-black bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 transition-transform hover:bg-accent-100 active:scale-95"
            >
              <Icon name="lucide:message-square-warning" size={15} />
              {landing.feedbackCta}
            </a>
          </div>
        </div>
      </section>

      {/* 特色列（三欄，行動版轉直排；欄間黑色分隔線） */}
      <section className="grid border-b-2 border-black sm:grid-cols-3">
        <FeatureItem
          name="lucide:qr-code"
          title={landing.featureFastTitle}
          description={landing.featureFastDesc}
        />
        <FeatureItem
          name="lucide:refresh-cw"
          title={landing.featureOfflineTitle}
          description={landing.featureOfflineDesc}
        />
        <FeatureItem
          name="lucide:bell-ring"
          title={landing.featureReportTitle}
          description={landing.featureReportDesc}
        />
      </section>

      {/* 使用須知（對外，深色帶） */}
      <section className="bg-slate-900 px-4 py-6 sm:px-11 sm:py-7">
        <div className="mb-4 flex items-center gap-2 text-[15px] font-black text-white">
          <Icon name="lucide:info" size={18} className="text-accent-400" />
          <span>{landing.noticeTitle}</span>
        </div>
        <ul className="flex list-disc flex-col gap-2.5 pl-5 text-slate-300 marker:text-slate-500">
          {landing.notices.map((notice, i) => (
            <li key={i} className="text-xs leading-relaxed sm:text-[12.5px]">
              <strong className="font-bold text-white">{notice.strong}</strong>
              {notice.rest}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RoleCard({
  iconName,
  iconClassName,
  title,
  description,
  href,
  cta,
  variant,
}: {
  iconName: string;
  iconClassName: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  variant: 'primary' | 'secondary';
}) {
  return (
    <div className="card flex items-center gap-4">
      <span
        className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-black ${iconClassName}`}
      >
        <Icon name={iconName} size={27} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="mb-1 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mb-3 text-xs leading-snug text-slate-500">{description}</p>
        <Link href={href} className="block">
          <Button variant={variant} className="w-full">
            {cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function FeatureItem({
  name,
  title,
  description,
}: {
  name: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b-2 border-black p-5 last:border-b-0 sm:border-b-0 sm:border-r-2 sm:last:border-r-0">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon name={name} size={19} className="text-primary-600" />
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-slate-500 max-sm:ml-[27px]">{description}</p>
    </div>
  );
}
