'use client';

import { Icon } from '@/components/ui/Icon';
import { useMessages } from '@/i18n/MessagesProvider';
import type { DashboardStatsData } from './types';

/** Dashboard 頂部跨班級簡易統計（002 US8 / FR-051）。 */
export function DashboardStats({ stats }: { stats: DashboardStatsData }) {
  const messages = useMessages();

  const cards = [
    {
      label: messages.teacher.dashboard.statRoomCount,
      value: stats.roomCount,
      icon: 'lucide:school',
      tone: 'text-slate-900',
    },
    {
      label: messages.teacher.dashboard.statInProgressTasks,
      value: stats.inProgressTaskCount,
      icon: 'lucide:clipboard-list',
      tone: 'text-primary-600',
    },
    {
      label: messages.teacher.dashboard.statAnomalies,
      value: stats.anomalyCount,
      icon: 'lucide:alert-triangle',
      tone: stats.anomalyCount > 0 ? 'text-red-600' : 'text-slate-900',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="card-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Icon name={c.icon} size={13} />
            {c.label}
          </div>
          <p className={`text-2xl font-bold ${c.tone}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
