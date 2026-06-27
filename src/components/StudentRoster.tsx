'use client';

import { memo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

interface RosterStudent {
  id: string;
  name: string;
  seatNumber?: number | null;
  isRemoved?: boolean;
}

interface StudentRosterProps {
  students: RosterStudent[];
  /** 點某列「編輯」icon（提供時才顯示編輯按鈕）。 */
  onEdit?: (student: RosterStudent) => void;
  /** 點某列「移除」icon（提供時才顯示移除按鈕）。 */
  onRemove?: (student: RosterStudent) => void;
  /** 目前正在編輯的學生 id，用於高亮對應列。 */
  editingId?: string | null;
}

/**
 * 老師端唯讀學生名單（002 US5）。
 * 與小老師端的勾選登記體驗（RecordForm）職責分離 —— 此元件**不含 checkbox**，
 * 只呈現名單並提供編輯 / 移除 icon 入口（由父層接 StudentForm）。
 */
function StudentRosterComponent({ students, onEdit, onRemove, editingId }: StudentRosterProps) {
  const messages = useMessages();

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-8 text-center">
        <Icon name="lucide:users" size={32} className="mb-2 text-slate-300" />
        <p className="text-sm text-slate-500">{messages.record.rosterEmpty}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label={messages.teacher.studentRoster}>
      {students.map((student) => (
        <li
          key={student.id}
          className={cn(
            'flex items-center gap-3 rounded-lg border-2 border-black bg-white px-3 py-2.5',
            editingId === student.id && 'ring-2 ring-primary-400'
          )}
        >
          {student.seatNumber != null && (
            <span className="seat-chip" aria-label={messages.record.seatAria(student.seatNumber)}>
              {student.seatNumber}
            </span>
          )}
          <span className="flex-1 truncate text-sm font-medium text-slate-900">{student.name}</span>

          <div className="flex flex-shrink-0 items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(student)}
                aria-label={messages.common.edit(student.name)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600"
              >
                <Icon name="lucide:pencil" size={15} />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(student)}
                aria-label={messages.common.remove(student.name)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Icon name="lucide:trash-2" size={15} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export const StudentRoster = memo(StudentRosterComponent);
export type { RosterStudent };
