'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useMessages } from '@/i18n/MessagesProvider';
import { resolveError } from '@/i18n/resolveError';
import type { Student } from '@/types';

export interface EditingStudent {
  id: string;
  name: string;
  seatNumber?: number | null;
}

interface StudentFormProps {
  roomId: string;
  /** null = 新增模式；非 null = 編輯模式（載入該學生）。 */
  editing: EditingStudent | null;
  onSaved: (student: Student, mode: 'add' | 'edit') => void;
  onCancelEdit: () => void;
}

/**
 * 內嵌學生表單（002 US2 / FR-024）。新增 ↔ 編輯模式切換，**不使用 modal**。
 * 與 TaskForm 共用相同的視覺結構與行為樣式（標題 + 正在編輯提示 + 取消編輯）。
 */
export function StudentForm({ roomId, editing, onSaved, onCancelEdit }: StudentFormProps) {
  const messages = useMessages();
  const [seat, setSeat] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = editing !== null;

  // 進入 / 切換編輯模式時載入該學生；回到新增模式時清空
  useEffect(() => {
    if (editing) {
      setSeat(editing.seatNumber != null ? String(editing.seatNumber) : '');
      setName(editing.name);
    } else {
      setSeat('');
      setName('');
    }
    setError('');
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !seat) return;
    setIsSaving(true);
    setError('');
    try {
      const url = isEditing
        ? `/api/rooms/${roomId}/students/${editing.id}`
        : `/api/rooms/${roomId}/students`;
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), seatNumber: parseInt(seat, 10) }),
      });

      if (res.ok) {
        const student = (await res.json()) as Student;
        onSaved(student, isEditing ? 'edit' : 'add');
        // 儲存後回到新增模式（清空）。編輯模式由父層把 editing 設回 null。
        setSeat('');
        setName('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(resolveError(messages, data.error));
      }
    } catch (err) {
      console.error('Failed to save student:', err);
      setError(messages.common.networkError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="card-title mb-0">
          {isEditing ? messages.common.edit(editing.name) : messages.teacher.addStudent}
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

      <div className="flex gap-2">
        <input
          type="number"
          value={seat}
          onChange={(e) => setSeat(e.target.value)}
          placeholder={messages.teacher.seatPlaceholder}
          min="1"
          max="99"
          required
          className="input w-16 text-center"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={messages.teacher.studentNamePlaceholder}
          className="input flex-1"
          maxLength={50}
        />
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isSaving}>
        {isEditing ? messages.common.confirm : messages.teacher.add}
      </Button>
    </form>
  );
}
