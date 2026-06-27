'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge, StatusBadgeVariant } from '@/components/ui/StatusBadge';
import { TaskResultView } from '@/components/TaskResultView';
import { Student, Task, TaskType } from '@/types';
import { getTaskDisplayState, type TaskBadge } from '@/lib/task';
import { formatDate } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

interface Room {
  id: string;
  name: string;
}

/**
 * 單一任務結果頁（002 US6 / FR-036）。只看結果、不編輯設定；
 * 入口：任務 tab 點任務名稱、班級狀況 tab 點警告。
 */
export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ roomId: string; taskId: string }>;
}) {
  const { roomId, taskId } = use(params);
  const messages = useMessages();
  const [room, setRoom] = useState<Room | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomRes, taskRes, studentsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}`),
          fetch(`/api/tasks/${roomId}/${taskId}`),
          fetch(`/api/rooms/${roomId}/students`),
        ]);
        if (roomRes.ok) setRoom(await roomRes.json());
        if (taskRes.ok) setTask(await taskRes.json());
        if (studentsRes.ok) setStudents(await studentsRes.json());
      } catch (error) {
        console.error('Failed to fetch task detail:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [roomId, taskId]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="loading-icon mb-3 h-12 w-12">
            <Icon name="lucide:clipboard-list" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">{messages.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!task || !room) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Icon name="lucide:frown" size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="mb-3 text-slate-600">{messages.room.notFoundTitle}</p>
          <Link href="/teacher" className="text-sm text-primary-600 hover:text-primary-700">
            {messages.nav.dashboard}
          </Link>
        </div>
      </div>
    );
  }

  const display = getTaskDisplayState(task);
  const badgeMeta: Record<TaskBadge, { variant: StatusBadgeVariant; label: string }> = {
    IN_PROGRESS: { variant: 'success', label: messages.teacher.taskList.badgeInProgress },
    DUE_EXPIRED: { variant: 'danger', label: messages.teacher.taskList.badgeDueExpired },
    HELPER_COMPLETED: { variant: 'info', label: messages.teacher.taskList.badgeHelperCompleted },
    CLOSED: { variant: 'neutral', label: messages.teacher.taskList.badgeClosed },
  };
  const badge = badgeMeta[display.badge];

  const assignedRemoved =
    task.assignedSeatNumber != null &&
    !students.some((s) => s.seatNumber === task.assignedSeatNumber && !s.isRemoved);

  return (
    <>
      <div className="page-header">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{task.name}</h1>
            <StatusBadge variant={task.type === TaskType.GRADE ? 'info' : 'neutral'} size="sm">
              {task.type === TaskType.GRADE ? messages.task.typeGrade : messages.task.typeSubmission}
            </StatusBadge>
            <StatusBadge variant={badge.variant} size="sm">
              {badge.label}
            </StatusBadge>
            {task.isArchived && (
              <StatusBadge variant="neutral" size="sm">
                {messages.teacher.taskDetail.infoArchived}
              </StatusBadge>
            )}
          </div>
          <Link
            href={`/teacher/rooms/${roomId}?tab=tasks`}
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <Icon name="lucide:pencil" size={14} />
            {messages.teacher.taskDetail.backToTasks}
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* 任務基本資訊 */}
        <div className="card-sm mb-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">{messages.teacher.taskDetail.infoAssigned}</p>
              <p className="font-medium text-slate-900">
                {task.assignedSeatNumber == null
                  ? messages.teacher.taskDetail.notAssigned
                  : assignedRemoved
                    ? messages.teacher.taskDetail.assignedRemoved(task.assignedSeatNumber)
                    : messages.teacher.assignedSeatLabel(task.assignedSeatNumber)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{messages.teacher.taskDetail.infoDue}</p>
              <p className="font-medium text-slate-900">
                {task.dueDate ? formatDate(task.dueDate) : messages.teacher.taskDetail.noDue}
              </p>
            </div>
          </div>
        </div>

        <TaskResultView task={task} roomName={room.name} students={students} />
      </div>
    </>
  );
}
