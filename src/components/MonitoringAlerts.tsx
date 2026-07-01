'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useMessages } from '@/i18n/MessagesProvider';
import type { Anomaly } from '@/lib/anomalyDetection';

export interface MonitoringWarning {
  taskId: string;
  taskName: string;
  dueDate: string | Date | null;
  anomalies: Anomaly[];
}

interface MonitoringAlertsProps {
  roomId: string;
  warnings: MonitoringWarning[];
}

/** 班級狀況警告區（002 US4 / FR-034）：點警告卡片 → 任務細節頁。 */
export function MonitoringAlerts({ roomId, warnings }: MonitoringAlertsProps) {
  const messages = useMessages();
  const router = useRouter();

  const reasonText = (a: Anomaly): string => {
    if (a.type === 'ASSIGNED_SEAT_IDLE') {
      return messages.teacher.classStatus.anomalyAssignedSeatIdle(a.assignedSeatNumber ?? 0);
    }
    return messages.teacher.classStatus.anomalyNoRecordsNearDue;
  };

  if (warnings.length === 0) {
    return (
      <div className="card-sm flex flex-col items-center justify-center py-12 text-center">
        <Icon name="lucide:check-circle-2" size={36} className="mb-2 text-emerald-400" />
        <p className="text-sm text-slate-500">{messages.teacher.classStatus.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
        <Icon name="lucide:alert-triangle" size={15} className="text-red-500" />
        {messages.teacher.classStatus.alertsTitle}
      </h3>
      {warnings.map((w) => (
        <button
          key={w.taskId}
          type="button"
          onClick={() => router.push(`/teacher/tasks/${roomId}/${w.taskId}`)}
          className="flex w-full items-center gap-3 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-left transition-colors hover:border-red-300 hover:bg-red-100"
        >
          <Icon name="lucide:alert-triangle" size={18} className="flex-shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{w.taskName}</p>
            <ul className="mt-0.5 space-y-0.5">
              {w.anomalies.map((a, i) => (
                <li key={i} className="text-xs text-red-700">
                  {reasonText(a)}
                </li>
              ))}
            </ul>
          </div>
          <Icon name="lucide:chevron-right" size={16} className="flex-shrink-0 text-red-400" />
        </button>
      ))}
    </div>
  );
}
