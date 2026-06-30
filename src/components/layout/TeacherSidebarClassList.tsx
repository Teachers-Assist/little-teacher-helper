'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';
import type { DashboardRoom } from '@/components/dashboard/types';

interface TeacherSidebarClassListProps {
  /** 點班級項目後的 callback（手機抽屜用來關閉）。 */
  onNavigate?: () => void;
}

/**
 * 側欄「我的班級」可展開清單（002 US8 / FR-059）。
 * 每筆顯示班級名 + 待辦數 + 異常數紅點；0 班時顯示提示 + 新增班級。
 */
export function TeacherSidebarClassList({ onNavigate }: TeacherSidebarClassListProps) {
  const messages = useMessages();
  const [rooms, setRooms] = useState<DashboardRoom[] | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const id = localStorage.getItem('teacherId');
      if (!id) {
        if (active) setRooms([]);
        return;
      }
      try {
        const r = await fetch(`/api/teachers/${id}/dashboard`);
        const d = r.ok ? await r.json() : null;
        if (active) setRooms(d?.rooms ?? []);
      } catch {
        if (active) setRooms([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={messages.nav.expandClasses}
        className="nav-item w-full justify-between"
      >
        <span className="flex items-center gap-2.5">
          <Icon name="lucide:school" size={17} className="text-slate-400" />
          {messages.nav.myClasses}
        </span>
        <Icon name={open ? 'lucide:chevron-down' : 'lucide:chevron-right'} size={14} className="text-slate-400" />
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5 pl-3">
          {rooms === null ? (
            <p className="px-3 py-1.5 text-xs text-slate-400">{messages.common.loading}</p>
          ) : rooms.length === 0 ? (
            <div className="px-3 py-2">
              <p className="mb-2 text-xs text-slate-400">{messages.nav.noClassYet}</p>
              <Link
                href="/teacher/rooms/new"
                onClick={onNavigate}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <Icon name="lucide:plus" size={13} />
                {messages.teacher.createRoom}
              </Link>
            </div>
          ) : (
            rooms.map((room) => (
              <Link
                key={room.id}
                href={`/teacher/rooms/${room.id}`}
                onClick={onNavigate}
                className="nav-subitem"
              >
                <span className="flex-1 truncate">{room.name}</span>
                {room.inProgressTaskCount > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">
                    {room.inProgressTaskCount}
                  </span>
                )}
                {room.anomalyCount > 0 && (
                  <span
                    className={cn('h-2 w-2 rounded-full bg-red-500')}
                    aria-label={`${room.anomalyCount}`}
                  />
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
