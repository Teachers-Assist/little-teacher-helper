'use client';

import { useState, memo, useCallback } from 'react';
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

// Student item component with memo for performance
interface StudentItemProps {
  student: Student;
  isSubmitted: boolean;
  isReadOnly: boolean;
  showSubmissionStatus: boolean;
  onToggle: (studentId: string) => void;
}

const StudentItem = memo(function StudentItem({
  student,
  isSubmitted,
  isReadOnly,
  showSubmissionStatus,
  onToggle,
}: StudentItemProps) {
  return (
    <button
      onClick={() => onToggle(student.id)}
      disabled={isReadOnly}
      aria-pressed={isSubmitted}
      aria-label={`${student.name} - ${isSubmitted ? '已繳交' : '未繳交'}，點擊${isSubmitted ? '取消' : '標記'}繳交`}
      className={cn(
        'flex items-center gap-3 rounded-xl p-4 text-left transition-all min-h-[56px]',
        isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
        isSubmitted
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800'
          : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600'
      )}
    >
      <Checkbox
        checked={isSubmitted}
        onChange={() => onToggle(student.id)}
        disabled={isReadOnly}
        checkboxSize="lg"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {student.seatNumber && (
            <span 
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-medium"
              aria-label={`座號 ${student.seatNumber}`}
            >
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
        <span className="text-lg" aria-hidden="true">{isSubmitted ? '✓' : ''}</span>
      )}
    </button>
  );
});

function StudentListComponent({
  students,
  submissions = {},
  onSubmissionChange,
  isReadOnly = false,
  showSubmissionStatus = true,
}: StudentListProps) {
  const [localSubmissions, setLocalSubmissions] = useState<SubmissionState>(submissions);

  const handleToggle = useCallback((studentId: string) => {
    if (isReadOnly) return;

    setLocalSubmissions((prev) => {
      const newValue = !prev[studentId];
      onSubmissionChange?.(studentId, newValue);
      return {
        ...prev,
        [studentId]: newValue,
      };
    });
  }, [isReadOnly, onSubmissionChange]);

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
      <div 
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="group"
        aria-label="學生繳交狀況列表"
      >
        {students.map((student) => (
          <StudentItem
            key={student.id}
            student={student}
            isSubmitted={localSubmissions[student.id] || false}
            isReadOnly={isReadOnly}
            showSubmissionStatus={showSubmissionStatus}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}

export const StudentList = memo(StudentListComponent);

