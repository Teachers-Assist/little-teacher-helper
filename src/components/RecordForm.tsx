'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RecorderBadge, AssignmentState } from '@/components/RecorderBadge';
import { Student, Task, TaskType, SubmissionStatus } from '@/types';
import { GRADE_MAX, GRADE_MIN, type TaskLockReason } from '@/lib/task';
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
  lockReason: TaskLockReason | null;
  onToggleSubmission: (studentId: string, submitted: boolean) => void;
  onChangeGrade: (studentId: string, grade: number | null) => void;
  onMarkComplete: () => void;
  /** 點「登記者：」badge 觸發換座號流程（US4） */
  onChangeSeat?: () => void;
  /**
   * US7 承諾核對：成績類任務尚未登滿時的缺口人數；null 表示不提示（繳交類 / 已登滿）。
   * 有缺口時，標記完成的確認彈窗改用「還有 N 個沒登記」承諾提示 + 兩出路。
   */
  markCompleteGapCount?: number | null;
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
  onChangeSeat,
  markCompleteGapCount,
}: RecordFormProps) {
  const messages = useMessages();
  const isGrade = task.type === TaskType.GRADE;
  const locked = lockReason !== null;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sorted = [...students].sort((a, b) => a.seatNumber - b.seatNumber);

  // 登記者身份視覺：三種指派狀態（FR-071）
  const assignmentState: AssignmentState =
    task.assignedSeatNumber == null
      ? 'noAssignment'
      : task.assignedSeatNumber === mySeatNumber
        ? 'assigned'
        : 'notAssigned';

  return (
    <div className="space-y-3">
      {/* 登記者身份 badge（常駐，名單外框正上方）— 承諾裝置持續可見（FR-070/071） */}
      <RecorderBadge
        seatNumber={mySeatNumber}
        assignmentState={assignmentState}
        onClick={onChangeSeat}
      />

      {/* 鎖定唯讀提示：三種成因三種說法（截止逾期 / 老師結案 / 自己標記完成）。
          MUST 依成因分流——說錯成因會讓學生找錯補救對象（見測試回饋問題一）。 */}
      {locked && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-black bg-red-100 p-3 text-sm font-medium text-red-900">
          <Icon name="lucide:lock" size={16} />
          {lockReason === 'DUE_PASSED'
            ? messages.task.lockedDuePassed
            : lockReason === 'CLOSED'
              ? messages.task.lockedClosedByTeacher
              : messages.task.lockedCompleted}
        </div>
      )}

      {/* 名單 */}
      <div className="card-sm">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-700">{messages.record.rosterTitle}</h3>
        </div>

        <div className="grid gap-2">
          {sorted.map((student) =>
            isGrade ? (
              <GradeRow
                key={student.id}
                student={student}
                value={values[student.id]?.gradeValue}
                disabled={locked}
                onChange={(grade) => onChangeGrade(student.id, grade)}
              />
            ) : (
              <SubmissionRow
                key={student.id}
                student={student}
                submitted={values[student.id]?.submissionStatus === SubmissionStatus.SUBMITTED}
                disabled={locked}
                onToggle={(submitted) => onToggleSubmission(student.id, submitted)}
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
        // US7：有缺口（成績類未登滿）→ 承諾核對提示 + 兩出路；否則沿用既有「完成後不能改」警語。
        // 登滿 / 繳交類 gapCount 為 null → 不觸發承諾提示（FR-117/118 / SC-029）。
        message={
          markCompleteGapCount != null && markCompleteGapCount > 0
            ? messages.task.commitCheckMessage(markCompleteGapCount)
            : messages.task.markCompleteWarning
        }
        confirmLabel={
          markCompleteGapCount != null && markCompleteGapCount > 0
            ? messages.task.commitContinue
            : messages.task.markComplete
        }
        cancelLabel={
          markCompleteGapCount != null && markCompleteGapCount > 0
            ? messages.task.commitGoBack
            : undefined
        }
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
      <Checkbox
        checked={submitted}
        onChange={() => onToggle(!submitted)}
        disabled={disabled}
        checkboxSize="lg"
        tabIndex={-1}
        aria-hidden="true"
      />
      <SeatName seat={student.seatNumber} name={student.name} />
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
  // 聚焦中不讓 props 覆蓋本地輸入。
  const [focused, setFocused] = useState(false);

  // 未聚焦時，讓輸入框跟隨最新的 value（重連 refetch／他人登記回填才顯示得出來）。
  // 用「渲染期調整 state」而非 effect —— 避免 setState-in-effect 的串聯渲染，且即時反映。
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue && !focused) {
    setLastValue(value);
    setText(value != null ? String(value) : '');
  }

  /**
   * 送出一次登記。**只在離開欄位（或頁面要走了）時呼叫**，不在打字過程中送。
   *
   * 原本停止輸入 500ms 就送，導致「把 80 改成 90」若在清空後停頓一下，中間那個空字串
   * 會被當成一次真正的刪除送出去（測試回饋問題四）。改成 blur-only 後，暫時性的空白
   * 不再有機會成為一次刪除。
   *
   * 與現值相同時直接略過：既省掉無謂的往返，也讓「點進欄位又離開」不再送出刪除
   * ——舊實作的 blur 一律 commit('')，光是滑過空欄位就會排一筆刪除 op。
   */
  const commit = (raw: string, current: number | undefined) => {
    const trimmed = raw.trim();
    const baseline = current != null ? String(current) : '';
    if (trimmed === baseline) {
      setError('');
      return;
    }
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

  // blur 之外的保命出口。blur-only 之後，若學生打完最後一格就鎖螢幕 / 切走 app，
  // blur 不保證會觸發（iOS Safari 尤其不可靠），那個值會直接消失——原本的 debounce
  // 剛好兼任了這個角色，拿掉就得補回來。
  //
  // 兩個 ref 的分工：latestRef 讓非 React 事件流（pagehide）讀得到當下的輸入內容與現值；
  // flushRef 讓監聽器只掛一次也永遠呼叫到最新的 commit（onChange 是行內箭頭函式，
  // 每次渲染換身分，放進依賴陣列會讓監聽器每次渲染重掛、卸載清理誤觸 flush）。
  const latestRef = useRef({ text, value });
  const flushRef = useRef<() => void>(() => {});
  useEffect(() => {
    latestRef.current = { text, value };
    flushRef.current = () => commit(latestRef.current.text, latestRef.current.value);
  });

  useEffect(() => {
    const onPageHide = () => flushRef.current();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushRef.current();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
      flushRef.current(); // 卸載（切頁 / 名單變動）時把還沒送出的值送出，不丟棄
    };
  }, []);

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
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value, value); // 離開欄位才登記
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
