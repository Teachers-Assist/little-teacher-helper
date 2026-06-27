'use client';

import { useEffect, useState, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useMessages } from '@/i18n/MessagesProvider';
import type { Student } from '@/types';

interface RemovedStudentsDrawerProps {
  roomId: string;
  open: boolean;
  onClose: () => void;
  /** 還原成功後通知父層（把該生加回主清單）。 */
  onRestored: (student: Student) => void;
}

/**
 * 已移除學生側拉抽屜（002 US2 / FR-026）：列出 isRemoved=true 的學生，一鍵還原。
 */
export function RemovedStudentsDrawer({
  roomId,
  open,
  onClose,
  onRestored,
}: RemovedStudentsDrawerProps) {
  const messages = useMessages();
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchRemoved = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/students?includeRemoved=true`);
      if (res.ok) {
        const all = (await res.json()) as Student[];
        setStudents(all.filter((s) => s.isRemoved));
      }
    } catch (err) {
      console.error('Failed to fetch removed students:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (open) fetchRemoved();
  }, [open, fetchRemoved]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleRestore = async (student: Student) => {
    setRestoringId(student.id);
    try {
      const res = await fetch(`/api/rooms/${roomId}/students/${student.id}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        const restored = (await res.json()) as Student;
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        onRestored(restored);
      } else {
        toast.error(messages.common.error);
      }
    } catch (err) {
      console.error('Failed to restore student:', err);
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
        aria-label={messages.teacher.studentList.removedDrawer}
        className="flex h-full w-full max-w-sm flex-col border-l-2 border-black bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
          <h2 className="text-base font-bold text-slate-900">
            {messages.teacher.studentList.removedDrawer}
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
          ) : students.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {messages.teacher.studentList.removedEmpty}
            </p>
          ) : (
            <ul className="space-y-2">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center gap-3 rounded-lg border-2 border-black bg-white px-3 py-2.5"
                >
                  <span className="seat-chip">{student.seatNumber}</span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-900">
                    {student.name}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={restoringId === student.id}
                    onClick={() => handleRestore(student)}
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
