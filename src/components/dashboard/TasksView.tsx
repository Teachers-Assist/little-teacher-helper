'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge, StatusBadgeVariant } from '@/components/ui/StatusBadge';
import { useMessages } from '@/i18n/MessagesProvider';
import { getTaskDisplayState, type TaskBadge } from '@/lib/task';
import { TaskType } from '@/types';
import type { Anomaly } from '@/lib/anomalyDetection';
import type { DashboardTask } from './types';

/** 按任務檢視（002 US8 / FR-054~056）：搜尋 + 跨班級進行中任務 + 異常插旗。 */
export function TasksView({ tasks }: { tasks: DashboardTask[] }) {
  const messages = useMessages();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.name.toLowerCase().includes(q));
  }, [tasks, query]);

  const badgeMeta: Record<TaskBadge, { variant: StatusBadgeVariant; label: string }> = {
    IN_PROGRESS: { variant: 'success', label: messages.teacher.taskList.badgeInProgress },
    DUE_EXPIRED: { variant: 'danger', label: messages.teacher.taskList.badgeDueExpired },
    HELPER_COMPLETED: { variant: 'info', label: messages.teacher.taskList.badgeHelperCompleted },
    CLOSED: { variant: 'neutral', label: messages.teacher.taskList.badgeClosed },
  };

  const anomalyText = (anomalies: Anomaly[]): string =>
    anomalies
      .map((a) =>
        a.type === 'ASSIGNED_SEAT_IDLE'
          ? messages.teacher.classStatus.anomalyAssignedSeatIdle(a.assignedSeatNumber ?? 0)
          : messages.teacher.classStatus.anomalyNoRecordsNearDue
      )
      .join('；');

  // 空狀態（無進行中任務）：隱藏搜尋框（FR-054 / AS8）
  if (tasks.length === 0) {
    return (
      <div className="card-sm py-12 text-center">
        <Icon name="lucide:clipboard-list" size={36} className="mx-auto mb-2 text-slate-200" />
        <p className="text-sm text-slate-500">{messages.teacher.dashboard.noInProgressTasks}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={messages.teacher.dashboard.searchPlaceholder}
        className="input w-full"
      />

      <div className="space-y-2">
        {filtered.map((task) => {
          const display = getTaskDisplayState({ status: task.status, dueDate: task.dueDate });
          const badge = badgeMeta[display.badge];
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => router.push(`/teacher/tasks/${task.roomId}/${task.id}`)}
              className="flex w-full items-center gap-3 rounded-lg border-2 border-black bg-white px-4 py-3 text-left transition-colors hover:bg-accent-100"
            >
              {task.isAnomaly && (
                <span title={anomalyText(task.anomalies)}>
                  <Icon name="lucide:alert-triangle" size={18} className="flex-shrink-0 text-red-500" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{task.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {messages.teacher.dashboard.recordedRatio(task.recordedCount, task.studentCount)}
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span>{task.roomName}</span>
                </p>
              </div>
              <StatusBadge variant={task.type === TaskType.GRADE ? 'info' : 'neutral'} size="sm">
                {task.type === TaskType.GRADE ? messages.task.typeGrade : messages.task.typeSubmission}
              </StatusBadge>
              <StatusBadge variant={badge.variant} size="sm">
                {badge.label}
              </StatusBadge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
