'use client';

import { StatTile } from '@/components/ui/StatTile';
import { useMessages } from '@/i18n/MessagesProvider';

export interface MonitoringStatsData {
  total: number;
  inProgress: number;
  anomalies: number;
  archived: number;
}

/** 班級狀況簡易統計卡片（002 US4 / FR-033）。 */
export function MonitoringStats({ stats }: { stats: MonitoringStatsData }) {
  const messages = useMessages();

  const cards = [
    { label: messages.teacher.classStatus.statTotal, value: stats.total, icon: 'lucide:clipboard-list', tone: 'text-slate-900' },
    { label: messages.teacher.classStatus.statInProgress, value: stats.inProgress, icon: 'lucide:play', tone: 'text-primary-600' },
    { label: messages.teacher.classStatus.statAnomalies, value: stats.anomalies, icon: 'lucide:alert-triangle', tone: stats.anomalies > 0 ? 'text-red-600' : 'text-slate-900' },
    { label: messages.teacher.classStatus.statArchived, value: stats.archived, icon: 'lucide:archive', tone: 'text-slate-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <StatTile key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />
      ))}
    </div>
  );
}
