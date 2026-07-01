'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';
import { SettingsMenu } from '@/components/SettingsMenu';
import { TeacherSidebarClassList } from '@/components/layout/TeacherSidebarClassList';

// Read teacherName from localStorage as an external store (SSR-safe).
const emptySubscribe = (): (() => void) => () => {};
const getTeacherName = (): string => localStorage.getItem('teacherName') || '';
const getServerTeacherName = (): string => '';

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}

function NavItem({ href, icon, label, active, onNavigate }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn('nav-item', { 'nav-item-active': active })}
    >
      <Icon
        name={icon}
        size={17}
        className={cn({ 'text-black': active, 'text-slate-400': !active })}
      />
      {label}
    </Link>
  );
}

/** 老師端側欄。002 US8：移除「班級」偽按鈕，加入「我的班級」可展開清單。 */
export function TeacherSidebar({
  onNavigate,
  drawer = false,
}: {
  onNavigate?: () => void;
  drawer?: boolean;
}) {
  const messages = useMessages();
  const pathname = usePathname();
  const teacherName = useSyncExternalStore(emptySubscribe, getTeacherName, getServerTeacherName);

  const isDashboard = pathname === '/teacher';

  return (
    <aside className={cn('app-sidebar', drawer && 'app-sidebar--drawer')}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b-2 border-black px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-accent-400">
          <Icon name="lucide:book-open" size={15} className="text-black" />
        </div>
        <span className="text-sm font-bold text-slate-900">{messages.nav.appName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {messages.nav.sectionGeneral}
        </p>
        <NavItem
          href="/teacher"
          icon="lucide:layout-dashboard"
          label={messages.nav.dashboard}
          active={isDashboard}
          onNavigate={onNavigate}
        />
        <TeacherSidebarClassList onNavigate={onNavigate} />
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5 border-t-2 border-black px-2 py-3">
        <SettingsMenu variant="sidebar" />
        {teacherName && (
          <div className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100">
              <Icon name="lucide:user" size={13} className="text-primary-600" />
            </div>
            <span className="truncate text-xs font-medium text-slate-600">{teacherName}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
