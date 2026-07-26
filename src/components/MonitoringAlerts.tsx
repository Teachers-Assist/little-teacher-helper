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

  const reasonText = (a: Anomaly, dueDate: string | Date | null): string => {
    if (a.type === 'TASK_STALLED') {
      const hours = a.idleMs ? Math.floor(a.idleMs / (60 * 60 * 1000)) : 0;
      return messages.teacher.classStatus.anomalyIdle(hours);
    }
    if (a.type === 'LOW_COMPLETION') {
      return messages.teacher.classStatus.anomalyLowCompletion(
        a.recordedCount ?? 0,
        a.classStudentCount ?? 0
      );
    }
    // NO_RECORDS_BY_DUE：顯示截止日（FR-085）
    const due = dueDate ? new Date(dueDate).toLocaleDateString() : '';
    return messages.teacher.classStatus.anomalyNearDue(due);
  };

  // 無異常時不畫卡片外框：白底方框與有異常時的紅色卡片風格不搭，只留 icon + 文字
  if (warnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
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
                  {reasonText(a, w.dueDate)}
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
