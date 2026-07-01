'use client';

import { useState } from 'react';
import { TeacherSidebar } from '@/components/layout/TeacherSidebar';
import { Icon } from '@/components/ui/Icon';
import { useMessages } from '@/i18n/MessagesProvider';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const messages = useMessages();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="sidebar-layout">
      {/* 桌機常駐側欄（< 768px 由 CSS 隱藏） */}
      <TeacherSidebar />

      {/* 小螢幕抽屜（FR-061） */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[220px]">
            <TeacherSidebar drawer onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="app-main">
        {/* 小螢幕頂部列：hamburger 開抽屜，避免移除返回連結後無法導航 */}
        <div className="flex items-center gap-2 border-b-2 border-black bg-white px-4 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={messages.nav.myClasses}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
          >
            <Icon name="lucide:menu" size={20} />
          </button>
          <span className="text-sm font-bold text-slate-900">{messages.nav.appName}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
