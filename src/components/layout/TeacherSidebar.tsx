'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <Link href={href} className={cn('nav-item', { 'nav-item-active': active })}>
      <Icon
        name={icon}
        size={17}
        className={cn({ 'text-black': active, 'text-slate-400': !active })}
      />
      {label}
    </Link>
  );
}

export function TeacherSidebar() {
  const pathname = usePathname();
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    setTeacherName(localStorage.getItem('teacherName') || '');
  }, []);

  const isRooms = pathname.startsWith('/teacher/rooms') || pathname.startsWith('/teacher/tasks');
  const isDashboard = pathname === '/teacher';

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b-2 border-black px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-accent-400">
          <Icon name="lucide:book-open" size={15} className="text-black" />
        </div>
        <span className="text-sm font-bold text-slate-900">小老師助手</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          一般
        </p>
        <NavItem
          href="/teacher"
          icon="lucide:layout-dashboard"
          label="儀表板"
          active={isDashboard}
        />
        <NavItem
          href="/teacher"
          icon="lucide:school"
          label="班級房間"
          active={isRooms}
        />
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5 border-t-2 border-black px-2 py-3">
        <NavItem href="#" icon="lucide:settings" label="設定" active={false} />
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
