'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  seatNumber?: number | null;
}

interface SubmissionState {
  [studentId: string]: boolean;
}

interface StudentListProps {
  students: Student[];
  submissions?: SubmissionState;
  onSubmissionChange?: (studentId: string, submitted: boolean) => void;
  isReadOnly?: boolean;
  showSubmissionStatus?: boolean;
}

export function StudentList({
  students,
  submissions = {},
  onSubmissionChange,
  isReadOnly = false,
  showSubmissionStatus = true,
}: StudentListProps) {
  const [localSubmissions, setLocalSubmissions] = useState<SubmissionState>(submissions);

  const handleToggle = (studentId: string) => {
    if (isReadOnly) return;

    const newValue = !localSubmissions[studentId];
    setLocalSubmissions((prev) => ({
      ...prev,
      [studentId]: newValue,
    }));
    onSubmissionChange?.(studentId, newValue);
  };

  const submittedCount = Object.values(localSubmissions).filter(Boolean).length;
  const totalCount = students.length;

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 p-8">
        <div className="mb-2 text-4xl">👥</div>
        <p className="text-slate-600 dark:text-slate-300">尚未新增學生</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      {showSubmissionStatus && (
        <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-700 p-4">
          <span className="font-medium text-slate-900 dark:text-white">繳交狀況</span>
          <div className="flex items-center gap-3">
            <StatusBadge variant="success">
              ✓ {submittedCount} 已繳
            </StatusBadge>
            <StatusBadge variant="danger">
              ✗ {totalCount - submittedCount} 未繳
            </StatusBadge>
          </div>
        </div>
      )}

      {/* Student Grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => {
          const isSubmitted = localSubmissions[student.id] || false;
          return (
            <button
              key={student.id}
              onClick={() => handleToggle(student.id)}
              disabled={isReadOnly}
              className={cn(
                'flex items-center gap-3 rounded-xl p-4 text-left transition-all',
                isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]',
                isSubmitted
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600'
              )}
            >
              <Checkbox
                checked={isSubmitted}
                onChange={() => handleToggle(student.id)}
                disabled={isReadOnly}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {student.seatNumber && (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-medium">
                      {student.seatNumber}
                    </span>
                  )}
                  <span
                    className={cn(
                      'font-medium truncate',
                      isSubmitted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    )}
                  >
                    {student.name}
                  </span>
                </div>
              </div>
              {showSubmissionStatus && (
                <span className="text-lg">{isSubmitted ? '✓' : ''}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

