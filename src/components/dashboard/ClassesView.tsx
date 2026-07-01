'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useMessages } from '@/i18n/MessagesProvider';
import { relativeTime } from './relativeTime';
import type { DashboardRoom } from './types';

/** 按班級檢視（002 US8 / FR-053）：每班一張卡片，含異常紅點與最近活動。 */
export function ClassesView({ rooms }: { rooms: DashboardRoom[] }) {
  const messages = useMessages();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <Link key={room.id} href={`/teacher/rooms/${room.id}`}>
          <div className="card-hover card-sm h-full">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">{room.name}</h3>
              {room.anomalyCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {room.anomalyCount}
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <Icon name="lucide:clipboard-list" size={14} className="text-slate-400" />
              {messages.teacher.dashboard.inProgressUnit(room.inProgressTaskCount)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <Icon name="lucide:clock" size={12} />
              {relativeTime(room.lastActivityAt, messages)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
