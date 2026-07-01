'use client';

import { StatTile } from '@/components/ui/StatTile';
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
        <StatTile key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />
      ))}
    </div>
  );
}
