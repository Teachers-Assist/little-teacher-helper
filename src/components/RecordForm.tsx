'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RecorderBadge } from '@/components/RecorderBadge';
import { Student, Task, TaskType, SubmissionStatus } from '@/types';
import { GRADE_MAX, GRADE_MIN } from '@/lib/task';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

/** 每位學生目前的登記值（無記錄＝未登記） */
export interface RecordValueMap {
  [studentId: string]: { submissionStatus?: SubmissionStatus; gradeValue?: number };
}

interface RecordFormProps {
  task: Task;
  students: Student[];
  mySeatNumber: number;
  values: RecordValueMap;
  lockReason: 'COMPLETED' | 'DUE_PASSED' | null;
  onToggleSubmission: (studentId: string, submitted: boolean) => void;
  onChangeGrade: (studentId: string, grade: number | null) => void;
  onMarkComplete: () => void;
}

export function RecordForm({
  task,
  students,
  mySeatNumber,
  values,
  lockReason,
  onToggleSubmission,
  onChangeGrade,
  onMarkComplete,
}: RecordFormProps) {
  const messages = useMessages();
  const isGrade = task.type === TaskType.GRADE;
  const locked = lockReason !== null;
  const [hasRecorded, setHasRecorded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sorted = [...students].sort((a, b) => a.seatNumber - b.seatNumber);

  // 指派提示（三種情況，spec US2 #3-5）
  const assignmentNote =
    task.assignedSeatNumber == null
      ? null
      : task.assignedSeatNumber === mySeatNumber
        ? { variant: 'success' as const, text: messages.identity.isAssigned }
        : { variant: 'warning' as const, text: messages.identity.notAssigned };

  const recordedCount = Object.keys(values).length;

  return (
    <div className="space-y-3">
      {/* 指派提示 */}
      {assignmentNote && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border-2 border-black p-3 text-sm font-medium',
            assignmentNote.variant === 'success' ? 'bg-green-100 text-green-900' : 'bg-accent-100 text-slate-900'
          )}
        >
          <Icon name="lucide:user-check" size={16} />
          {assignmentNote.text}
        </div>
      )}

      {/* 鎖定唯讀提示（截止逾期 vs 已標記完成，兩種文案） */}
      {locked && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-black bg-red-100 p-3 text-sm font-medium text-red-900">
          <Icon name="lucide:lock" size={16} />
          {lockReason === 'DUE_PASSED' ? messages.task.lockedDuePassed : messages.task.lockedCompleted}
        </div>
      )}

      {/* 登記者標示 */}
      {hasRecorded && !locked && (
        <div>
          <RecorderBadge seatNumber={mySeatNumber} />
        </div>
      )}

      {/* 名單 */}
      <div className="card-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">{messages.record.rosterTitle}</h3>
          {!isGrade && (
            <div className="flex items-center gap-1.5">
              <StatusBadge variant="success" size="sm">
                {messages.record.submittedCount(recordedCount)}
              </StatusBadge>
              <StatusBadge variant="danger" size="sm">
                {messages.record.notSubmittedCount(students.length - recordedCount)}
              </StatusBadge>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          {sorted.map((student) =>
            isGrade ? (
              <GradeRow
                key={student.id}
                student={student}
                value={values[student.id]?.gradeValue}
                disabled={locked}
                onChange={(grade) => {
                  onChangeGrade(student.id, grade);
                  setHasRecorded(true);
                }}
              />
            ) : (
              <SubmissionRow
                key={student.id}
                student={student}
                submitted={values[student.id]?.submissionStatus === SubmissionStatus.SUBMITTED}
                disabled={locked}
                onToggle={(submitted) => {
                  onToggleSubmission(student.id, submitted);
                  setHasRecorded(true);
                }}
              />
            )
          )}
        </div>
      </div>

      {/* 標記登記完畢 */}
      {!locked && (
        <Button variant="secondary" className="w-full" onClick={() => setConfirmOpen(true)}>
          <Icon name="lucide:check-check" size={16} />
          {messages.task.markComplete}
        </Button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={messages.task.markComplete}
        message={messages.task.markCompleteWarning}
        confirmLabel={messages.task.markComplete}
        confirmVariant="secondary"
        onConfirm={() => {
          setConfirmOpen(false);
          onMarkComplete();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// ── 繳交列（勾選） ──────────────────────────────────────────────
function SubmissionRow({
  student,
  submitted,
  disabled,
  onToggle,
}: {
  student: Student;
  submitted: boolean;
  disabled: boolean;
  onToggle: (submitted: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!submitted)}
      disabled={disabled}
      aria-pressed={submitted}
      className={cn(
        'flex min-h-[56px] items-center gap-3 rounded-xl border-2 border-black p-3 text-left transition-colors',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer active:bg-accent-100',
        submitted ? 'bg-green-100' : 'bg-white'
      )}
    >
      <Checkbox checked={submitted} onChange={() => onToggle(!submitted)} disabled={disabled} checkboxSize="lg" tabIndex={-1} aria-hidden="true" />
      <SeatName seat={student.seatNumber} name={student.name} />
      {submitted && <Icon name="lucide:check" size={18} className="text-green-700" />}
    </button>
  );
}

// ── 成績列（數字輸入） ──────────────────────────────────────────
function GradeRow({
  student,
  value,
  disabled,
  onChange,
}: {
  student: Student;
  value: number | undefined;
  disabled: boolean;
  onChange: (grade: number | null) => void;
}) {
  const messages = useMessages();
  const [text, setText] = useState(value != null ? String(value) : '');
  const [error, setError] = useState('');

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      setError('');
      onChange(null); // 清空＝刪除記錄
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      setError(messages.record.numberOnly);
      return;
    }
    const num = Number(trimmed);
    if (num < GRADE_MIN || num > GRADE_MAX) {
      setError(messages.record.gradeRange);
      return;
    }
    setError('');
    onChange(num);
  };

  return (
    <div className="flex min-h-[56px] items-center gap-3 rounded-xl border-2 border-black bg-white p-3">
      <SeatName seat={student.seatNumber} name={student.name} />
      <div className="flex flex-col items-end">
        <input
          type="text"
          inputMode="numeric"
          className="input w-20 text-center"
          placeholder={messages.record.gradePlaceholder}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
        />
        {error && <span className="mt-0.5 text-xs font-medium text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function SeatName({ seat, name }: { seat: number; name: string }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <span className="seat-chip">{seat}</span>
      <span className="truncate font-medium text-slate-900">{name}</span>
    </div>
  );
}

export default RecordForm;
