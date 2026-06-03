'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Student, Task, TaskType, TaskStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import { messages } from '@/messages/zh-TW';

interface Room {
  id: string;
  name: string;
}

type TaskWithCount = Task & { _count?: { records: number } };

type PendingAction =
  | { kind: 'reopen' | 'close' | 'delete'; taskId: string }
  | null;

export default function TaskManagementPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [tasks, setTasks] = useState<TaskWithCount[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 新增任務表單
  const [name, setName] = useState('');
  const [type, setType] = useState<TaskType>(TaskType.SUBMISSION);
  const [assignedSeat, setAssignedSeat] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [pending, setPending] = useState<PendingAction>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [roomRes, tasksRes, studentsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}`),
          fetch(`/api/tasks/${roomId}`),
          fetch(`/api/rooms/${roomId}/students`),
        ]);
        if (roomRes.ok) setRoom(await roomRes.json());
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (studentsRes.ok) setStudents(await studentsRes.json());
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [roomId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch(`/api/tasks/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          assignedSeatNumber: assignedSeat ? Number(assignedSeat) : undefined,
          dueDate: dueDate || undefined,
        }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks((prev) => [{ ...task, _count: { records: 0 } }, ...prev]);
        setName('');
        setAssignedSeat('');
        setDueDate('');
        setType(TaskType.SUBMISSION);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const patchStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${roomId}/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${roomId}/${taskId}`, { method: 'DELETE' });
      if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const runPending = () => {
    if (!pending) return;
    if (pending.kind === 'reopen') patchStatus(pending.taskId, TaskStatus.ACTIVE);
    if (pending.kind === 'close') patchStatus(pending.taskId, TaskStatus.CLOSED);
    if (pending.kind === 'delete') removeTask(pending.taskId);
    setPending(null);
  };

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

  if (!room) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Icon name="lucide:frown" size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="mb-3 text-slate-600">{messages.room.notFoundTitle}</p>
          <Link href="/teacher" className="text-sm text-primary-600 hover:text-primary-700">{messages.nav.dashboard}</Link>
        </div>
      </div>
    );
  }

  const seatOptions = [...students].sort((a, b) => a.seatNumber - b.seatNumber);

  return (
    <>
      <div className="page-header">
        <Link
          href={`/teacher/rooms/${roomId}`}
          className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600"
        >
          <Icon name="lucide:arrow-left" size={14} />
          {messages.teacher.backTo(room.name)}
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{messages.teacher.taskMgmtTitle}</h1>
      </div>

      <div className="page-body">
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          {/* 新增任務 */}
          <div className="lg:col-span-1">
            <div className="card-sm">
              <h3 className="card-title">{messages.teacher.newTask}</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{messages.teacher.taskName}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={messages.teacher.taskNamePlaceholder}
                    className="input"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{messages.teacher.taskType}</label>
                  <div className="flex gap-2">
                    {[TaskType.SUBMISSION, TaskType.GRADE].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={
                          'flex-1 rounded-lg border-2 border-black px-3 py-2 text-sm font-bold transition-colors ' +
                          (type === t ? 'bg-accent-300 text-black' : 'bg-white text-slate-600')
                        }
                      >
                        {t === TaskType.GRADE ? messages.task.typeGrade : messages.task.typeSubmission}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{messages.teacher.assignSeat}</label>
                  <select value={assignedSeat} onChange={(e) => setAssignedSeat(e.target.value)} className="input">
                    <option value="">{messages.teacher.assignNone}</option>
                    {seatOptions.map((s) => (
                      <option key={s.id} value={s.seatNumber}>
                        {messages.identity.seatLabel(s.seatNumber)} {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{messages.teacher.due}</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
                </div>

                <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isCreating}>
                  {messages.teacher.createTask}
                </Button>
              </form>
            </div>
          </div>

          {/* 任務列表 */}
          <div className="lg:col-span-2">
            <div className="card-sm">
              <h3 className="card-title">
                {messages.teacher.taskListTitle}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                  {tasks.length}
                </span>
              </h3>

              {tasks.length === 0 ? (
                <div className="py-10 text-center">
                  <Icon name="lucide:clipboard-list" size={36} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-500">{messages.teacher.noTasks}</p>
                  <p className="mt-1 text-xs text-slate-400">{messages.teacher.noTasksHint}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="rounded-lg border-2 border-black bg-white p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-900">{task.name}</p>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <StatusBadge variant={task.type === TaskType.GRADE ? 'info' : 'neutral'} size="sm">
                            {task.type === TaskType.GRADE ? messages.task.typeGrade : messages.task.typeSubmission}
                          </StatusBadge>
                          {task.status === TaskStatus.HELPER_COMPLETED && (
                            <StatusBadge variant="success" size="sm">{messages.task.statusHelperCompleted}</StatusBadge>
                          )}
                          {task.status === TaskStatus.CLOSED && (
                            <StatusBadge variant="neutral" size="sm">{messages.task.statusClosed}</StatusBadge>
                          )}
                          {task.status === TaskStatus.ACTIVE && (
                            <StatusBadge variant="warning" size="sm">{messages.task.statusActive}</StatusBadge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{messages.teacher.recorded(task._count?.records ?? 0, students.length)}</span>
                        {task.assignedSeatNumber != null && (
                          <span>{messages.teacher.assignedSeatLabel(task.assignedSeatNumber)}</span>
                        )}
                        {task.dueDate && <span>{messages.task.dueLabel(formatDate(task.dueDate))}</span>}
                      </div>

                      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
                        {task.status !== TaskStatus.ACTIVE && (
                          <Button size="sm" variant="outline" onClick={() => setPending({ kind: 'reopen', taskId: task.id })}>
                            <Icon name="lucide:unlock" size={13} />
                            {messages.teacher.reopen}
                          </Button>
                        )}
                        {task.status !== TaskStatus.CLOSED && (
                          <Button size="sm" variant="ghost" onClick={() => setPending({ kind: 'close', taskId: task.id })}>
                            {messages.teacher.close}
                          </Button>
                        )}
                        <button
                          className="ml-auto rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setPending({ kind: 'delete', taskId: task.id })}
                          aria-label={messages.teacher.delete}
                        >
                          <Icon name="lucide:trash-2" size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'delete'
            ? messages.teacher.deleteTitle
            : pending?.kind === 'close'
              ? messages.teacher.closeTitle
              : messages.teacher.reopenTitle
        }
        message={
          pending?.kind === 'delete'
            ? messages.teacher.deleteConfirm
            : pending?.kind === 'close'
              ? messages.teacher.closeConfirm
              : messages.teacher.reopenConfirm
        }
        confirmLabel={
          pending?.kind === 'delete'
            ? messages.teacher.delete
            : pending?.kind === 'close'
              ? messages.teacher.close
              : messages.teacher.reopen
        }
        confirmVariant={pending?.kind === 'delete' ? 'danger' : 'primary'}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
