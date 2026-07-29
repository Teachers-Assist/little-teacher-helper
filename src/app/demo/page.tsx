'use client';

// 006 推廣示範沙盒——老師端示範舞台（T606 骨架 + 常駐示範模式標示帶）。
// 內容區的班級狀況/三任務（US2）、顯示 QRCode（US3）、特色 hint（US6）、
// 建班邀請（US5）於後續 task 接入。獨立入口，MUST NOT 寫 teacherId（FR-142）。

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useMessages } from '@/i18n/MessagesProvider';
import { resetDemo } from '@/lib/demo/store';

export default function DemoPage() {
  const { demo, teacher } = useMessages();

  return (
    <div className="mx-auto w-full max-w-[1120px] sm:border-x-2 sm:border-black">
      {/* 常駐示範模式標示帶（安全說明；與特色 hint、建班邀請視覺分離） */}
      <div className="flex flex-col gap-2.5 border-b-2 border-black bg-accent-400 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-start gap-2">
          <Icon name="lucide:info" size={18} className="mt-px shrink-0 text-black" />
          <p className="text-xs font-medium leading-snug text-slate-900 sm:text-sm">
            <strong className="font-black">{demo.banner.title}</strong>
            <span className="mx-1.5 text-slate-700">·</span>
            {demo.banner.desc}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetDemo}>
            <Icon name="lucide:rotate-ccw" size={15} />
            {demo.banner.restart}
          </Button>
          <Link href="/teacher">
            <Button variant="primary" size="sm">
              {teacher.createRoom}
            </Button>
          </Link>
        </div>
      </div>

      {/* 示範舞台內容：US2 班級狀況 + 三任務、US3 顯示 QRCode —— 後續 task 接入 */}
      <div className="px-4 py-8 sm:px-10">
        <div className="empty-state" />
      </div>
    </div>
  );
}
