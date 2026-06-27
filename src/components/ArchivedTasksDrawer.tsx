'use client';

import { useEffect, useState, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useMessages } from '@/i18n/MessagesProvider';
import type { Task } from '@/types';

interface ArchivedTasksDrawerProps {
  roomId: string;
  open: boolean;
  onClose: () => void;
  /** 還原成功後通知父層（把該任務加回主清單）。 */
  onRestored: (task: Task) => void;
}

/**
 * 已封存任務側拉抽屜（002 US3 / FR-032）：列出 isArchived=true 的任務，一鍵還原。
 */
export function ArchivedTasksDrawer({ roomId, open, onClose, onRestored }: ArchivedTasksDrawerProps) {
  const messages = useMessages();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchArchived = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks/${roomId}?includeArchived=true`);
      if (res.ok) {
        const all = (await res.json()) as Task[];
        setTasks(all.filter((t) => t.isArchived));
      }
    } catch (err) {
      console.error('Failed to fetch archived tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (open) fetchArchived();
  }, [open, fetchArchived]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleRestore = async (task: Task) => {
    setRestoringId(task.id);
    try {
      const res = await fetch(`/api/tasks/${roomId}/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false }),
      });
      if (res.ok) {
        const restored = (await res.json()) as Task;
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        onRestored(restored);
      } else {
        toast.error(messages.common.error);
      }
    } catch (err) {
      console.error('Failed to restore task:', err);
      toast.error(messages.common.networkError);
    } finally {
      setRestoringId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={messages.teacher.taskList.archivedDrawer}
        className="flex h-full w-full max-w-sm flex-col border-l-2 border-black bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
          <h2 className="text-base font-bold text-slate-900">
            {messages.teacher.taskList.archivedDrawer}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.common.cancel}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon name="lucide:x" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">{messages.common.loading}</p>
          ) : tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{messages.teacher.noTasks}</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border-2 border-black bg-white px-3 py-2.5"
                >
                  <span className="flex-1 truncate text-sm font-medium text-slate-900">
                    {task.name}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={restoringId === task.id}
                    onClick={() => handleRestore(task)}
                  >
                    <Icon name="lucide:rotate-ccw" size={13} />
                    {messages.teacher.studentList.restore}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
