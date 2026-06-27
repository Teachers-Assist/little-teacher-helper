'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useMessages } from '@/i18n/MessagesProvider';
import { resolveError } from '@/i18n/resolveError';
import { TaskType, TaskStatus, type Task } from '@/types';
import { formatDate } from '@/lib/utils';

export interface EditingTask {
  id: string;
  name: string;
  type: TaskType;
  assignedSeatNumber?: number | null;
  dueDate?: Date | string | null;
  status: TaskStatus;
}

/** 編輯入口來源：影響 autoFocus 與儲存後的 status 處理（FR-043）。 */
export type EditSource = 'normal' | 'extendDue' | 'reopen';

interface TaskFormProps {
  roomId: string;
  /** null = 新增模式；非 null = 編輯模式。 */
  editing: EditingTask | null;
  /** 編輯入口來源（延長截止 / 重新開放）。 */
  editSource?: EditSource;
  /** 可指定的座號清單（在籍學生）。 */
  seatOptions: number[];
  onSaved: (task: Task, mode: 'add' | 'edit') => void;
  onCancelEdit: () => void;
}

// 本地日期 → 'YYYY-MM-DD'（給 <input type="date"> 用）
function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayInput(): string {
  return toDateInput(new Date());
}

function isPast(value: Date | string | null | undefined): boolean {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

/**
 * 內嵌任務表單（002 US3 / FR-028, FR-029, FR-039, FR-040, FR-043）。
 * 新增 ↔ 編輯模式切換，**不使用 drawer / modal**。與 StudentForm 共用互動樣式。
 */
export function TaskForm({
  roomId,
  editing,
  editSource = 'normal',
  seatOptions,
  onSaved,
  onCancelEdit,
}: TaskFormProps) {
  const messages = useMessages();
  const [name, setName] = useState('');
  const [type, setType] = useState<TaskType>(TaskType.SUBMISSION);
  const [assignedSeat, setAssignedSeat] = useState('');
  const [due, setDue] = useState('');
  /** 編輯時原截止日已過 → 顯示輔助文字（FR-040）。 */
  const [expiredHint, setExpiredHint] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const dueRef = useRef<HTMLInputElement>(null);

  const isEditing = editing !== null;

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setAssignedSeat(editing.assignedSeatNumber != null ? String(editing.assignedSeatNumber) : '');
      // FR-040：原截止日已過 → 自動清空欄位並顯示輔助文字
      if (isPast(editing.dueDate)) {
        setDue('');
        setExpiredHint(
          messages.teacher.taskForm.dueDateExpiredHint(formatDate(editing.dueDate as Date))
        );
      } else {
        setDue(editing.dueDate ? toDateInput(new Date(editing.dueDate)) : '');
        setExpiredHint(null);
      }
    } else {
      setName('');
      setType(TaskType.SUBMISSION);
      setAssignedSeat('');
      setDue('');
      setExpiredHint(null);
    }
    setError('');
  }, [editing, messages]);

  // 延長截止 / 重新開放入口：聚焦截止日欄位（FR-043）
  useEffect(() => {
    if (editing && (editSource === 'extendDue' || editSource === 'reopen')) {
      dueRef.current?.focus();
    }
  }, [editing, editSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // FR-039：提交前驗證，阻擋過往日期（HTML min 為第一道防線）
    if (due && due < todayInput()) {
      setError(messages.teacher.taskForm.dueDatePastError);
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      // date-only → 當天結束（23:59:59 本地時間），留空則 null
      const dueDate = due ? new Date(`${due}T23:59:59`).toISOString() : null;

      const seat = assignedSeat ? parseInt(assignedSeat, 10) : null;

      let res: Response;
      if (isEditing) {
        const body: Record<string, unknown> = {
          name: name.trim(),
          assignedSeatNumber: seat,
          dueDate,
        };
        // 重新開放 CLOSED 任務：儲存同時將 status 設回 ACTIVE（FR-043）
        if (editSource === 'reopen') body.status = TaskStatus.ACTIVE;
        res = await fetch(`/api/tasks/${roomId}/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/tasks/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), type, assignedSeatNumber: seat, dueDate }),
        });
      }

      if (res.ok) {
        const task = (await res.json()) as Task;
        onSaved(task, isEditing ? 'edit' : 'add');
        setName('');
        setType(TaskType.SUBMISSION);
        setAssignedSeat('');
        setDue('');
        setExpiredHint(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(resolveError(messages, data.error));
      }
    } catch (err) {
      console.error('Failed to save task:', err);
      setError(messages.common.networkError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="card-title mb-0">
          {isEditing ? messages.teacher.taskForm.editing(editing.name) : messages.teacher.newTask}
        </h3>
        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            {messages.teacher.taskForm.cancelEdit}
          </button>
        )}
      </div>

      {/* 任務名稱 + 任務類型同列 */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {messages.teacher.taskName}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={messages.teacher.taskNamePlaceholder}
            className="input w-full"
            maxLength={100}
            required
          />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {messages.teacher.taskType}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="input w-full"
            disabled={isEditing}
          >
            <option value={TaskType.SUBMISSION}>{messages.task.typeSubmission}</option>
            <option value={TaskType.GRADE}>{messages.task.typeGrade}</option>
          </select>
        </div>
      </div>

      {/* 指定小老師 + 截止時間同列 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {messages.teacher.assignSeat}
          </label>
          <select
            value={assignedSeat}
            onChange={(e) => setAssignedSeat(e.target.value)}
            className="input w-full"
          >
            <option value="">{messages.teacher.assignNone}</option>
            {seatOptions.map((seat) => (
              <option key={seat} value={seat}>
                {messages.teacher.assignedSeatLabel(seat)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {messages.teacher.due}
          </label>
          <input
            ref={dueRef}
            type="date"
            value={due}
            min={todayInput()}
            onChange={(e) => setDue(e.target.value)}
            className="input w-full"
          />
        </div>
      </div>
      {expiredHint && <p className="-mt-1 text-xs text-amber-600">{expiredHint}</p>}

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isSaving}>
        {isEditing ? messages.common.confirm : messages.teacher.createTask}
      </Button>
    </form>
  );
}
