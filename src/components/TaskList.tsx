'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Task, TaskType, TaskStatus } from '@/types';
import { getTaskLockReason } from '@/lib/task';
import { formatDate } from '@/lib/utils';
import { messages } from '@/messages/zh-TW';

interface TaskListProps {
  roomId: string;
  tasks: Task[];
  /** 目前小老師的座號，用來標示「指定給你」的任務 */
  mySeatNumber: number;
}

/**
 * 小老師端任務清單：指定給自己的任務特別標示，其餘正常顯示（spec US5 #4）。
 */
export function TaskList({ roomId, tasks, mySeatNumber }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="lucide:clipboard-list" size={36} className="mx-auto mb-2 text-slate-300" />
        <h2 className="mb-1 text-base font-semibold text-slate-900">{messages.task.empty}</h2>
        <p className="text-sm text-slate-500">{messages.task.emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tasks.map((task) => {
        const isMine = task.assignedSeatNumber === mySeatNumber;
        const lock = getTaskLockReason(task);

        return (
          <Link key={task.id} href={`/helper/${roomId}/${task.id}`}>
            <div className="card-sm card-hover">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900">{task.name}</h3>
                <Icon name="lucide:pen-line" size={16} className="flex-shrink-0 text-slate-400" />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge variant={task.type === TaskType.GRADE ? 'info' : 'neutral'} size="sm">
                  {task.type === TaskType.GRADE ? messages.task.typeGrade : messages.task.typeSubmission}
                </StatusBadge>

                {isMine && (
                  <StatusBadge variant="warning" size="sm">
                    <Icon name="lucide:star" size={11} />
                    {messages.task.assignedToYou}
                  </StatusBadge>
                )}

                {task.status === TaskStatus.HELPER_COMPLETED && (
                  <StatusBadge variant="success" size="sm">{messages.task.statusHelperCompleted}</StatusBadge>
                )}
                {task.status === TaskStatus.CLOSED && (
                  <StatusBadge variant="neutral" size="sm">{messages.task.statusClosed}</StatusBadge>
                )}
                {lock === 'DUE_PASSED' && (
                  <StatusBadge variant="danger" size="sm">{messages.task.statusActive}・逾期</StatusBadge>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {task.dueDate ? messages.task.dueLabel(formatDate(task.dueDate)) : messages.task.noDue}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default TaskList;
