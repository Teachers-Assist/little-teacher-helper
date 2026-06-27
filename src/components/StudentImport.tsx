'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useMessages } from '@/i18n/MessagesProvider';
import { resolveError } from '@/i18n/resolveError';
import { parseStudentExcel, type ImportRowError, type ParsedStudent } from '@/lib/excelParser';
import type { Student } from '@/types';

const TEMPLATE_URL = '/templates/students-template.xlsx';

interface StudentImportProps {
  /** 提供時走 API 匯入模式（rooms/[id]）；不提供時走收集模式（rooms/new）。 */
  roomId?: string;
  /** API 模式：寫入成功後回傳建立的學生。 */
  onImported?: (students: Student[]) => void;
  /** 收集模式：解析成功後回傳乾淨的學生資料給父層。 */
  onParsed?: (students: ParsedStudent[]) => void;
}

interface ConflictRow {
  rowNumber: number;
  field: 'seat' | 'name' | null;
  code: string;
}

export function StudentImport({ roomId, onImported, onParsed }: StudentImportProps) {
  const messages = useMessages();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);

  const reset = () => {
    setFileError(null);
    setConflicts([]);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 允許重新選同一個檔案
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    reset();
    setIsBusy(true);
    try {
      const parsed = await parseStudentExcel(file);

      if (!parsed.ok) {
        if (parsed.fileErrorCode) {
          setFileError(resolveError(messages, parsed.fileErrorCode));
        }
        if (parsed.rowErrors) {
          setConflicts(parsed.rowErrors as ImportRowError[]);
        }
        return;
      }

      // 收集模式：直接回傳給父層
      if (!roomId) {
        onParsed?.(parsed.students);
        toast.success(messages.teacher.studentList.importSuccess(parsed.students.length));
        return;
      }

      // API 模式：上傳乾淨 JSON，後端做既有資料衝突檢查 + 原子寫入
      const res = await fetch(`/api/rooms/${roomId}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsed.students }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { created: number; students: Student[] };
        onImported?.(data.students);
        toast.success(messages.teacher.studentList.importSuccess(data.created));
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data.conflicts)) {
        setConflicts(data.conflicts as ConflictRow[]);
      } else {
        setFileError(resolveError(messages, data.error));
      }
    } catch (err) {
      console.error('Failed to import students:', err);
      setFileError(messages.common.networkError);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{messages.teacher.studentList.importHint}</p>

      <div className="flex flex-wrap gap-2">
        <a href={TEMPLATE_URL} download>
          <Button type="button" variant="outline" size="sm">
            <Icon name="lucide:download" size={14} />
            {messages.teacher.studentList.importTemplate}
          </Button>
        </a>
        <Button
          type="button"
          variant="primary"
          size="sm"
          isLoading={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="lucide:upload" size={14} />
          {messages.teacher.studentList.import}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {fileError && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {fileError}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3">
          <p className="mb-2 text-sm font-semibold text-red-700">
            {messages.teacher.studentList.importConflictTitle}
          </p>
          <ul className="space-y-1 text-xs text-red-700">
            {conflicts.map((c, i) => (
              <li key={`${c.rowNumber}-${c.field}-${i}`} className="flex gap-1.5">
                <span className="font-mono font-semibold">
                  {messages.teacher.studentList.importErrors.rowLabel(c.rowNumber)}
                </span>
                <span>{resolveError(messages, c.code)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
