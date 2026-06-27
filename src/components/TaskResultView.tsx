'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Student, Task, TaskType, SubmissionStatus } from '@/types';
import { generateTextReport, printReport, copyToClipboard, ReportData } from '@/lib/report';
import { formatDateTime } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

interface RecordWithStudent {
  studentId: string;
  submissionStatus?: SubmissionStatus | null;
  gradeValue?: number | null;
  recorderSeatNumber: number;
  isAssignedRecorder: boolean;
  createdAt: string;
  updatedAt: string;
  student: { id: string; name: string; seatNumber: number; isRemoved: boolean };
}

interface TaskResultViewProps {
  task: Task;
  roomName: string;
  students: Student[];
}

/**
 * 單一任務的完整結果視圖（002 US6 / FR-036）：摘要 + 登記明細（含登記者座號、時間）
 * + 未登記學生 + 匯出（列印 / 複製文字）。只看結果、不編輯設定。
 */
export function TaskResultView({ task, roomName, students }: TaskResultViewProps) {
  const messages = useMessages();
  const [records, setRecords] = useState<RecordWithStudent[] | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/records?taskId=${task.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data: RecordWithStudent[]) => {
        if (active) setRecords(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [task.id]);

  const isGrade = task.type === TaskType.GRADE;

  const recordedStudentIds = useMemo(
    () => new Set((records ?? []).map((r) => r.studentId)),
    [records]
  );

  const unrecorded = useMemo(
    () =>
      [...students]
        .filter((s) => !recordedStudentIds.has(s.id))
        .sort((a, b) => a.seatNumber - b.seatNumber),
    [students, recordedStudentIds]
  );

  const report: ReportData | null = useMemo(() => {
    if (!records) return null;
    const byId = new Map(records.map((r) => [r.studentId, r]));
    const rows = [...students]
      .sort((a, b) => a.seatNumber - b.seatNumber)
      .map((s) => {
        const rec = byId.get(s.id);
        const done = isGrade
          ? rec?.gradeValue != null
          : rec?.submissionStatus === SubmissionStatus.SUBMITTED;
        const result = isGrade
          ? rec?.gradeValue != null
            ? String(rec.gradeValue)
            : messages.report.notRecorded
          : done
            ? messages.report.resultSubmitted
            : messages.report.resultNotSubmitted;
        return { seatNumber: s.seatNumber, name: s.name, result, done };
      });
    return {
      taskName: task.name,
      className: roomName,
      type: isGrade ? 'GRADE' : 'SUBMISSION',
      generatedAt: messages.report.generatedAt(formatDateTime(new Date())),
      total: rows.length,
      recorded: rows.filter((r) => r.done).length,
      rows,
    };
  }, [records, students, isGrade, task.name, roomName, messages]);

  const handleCopy = useCallback(async () => {
    if (!report) return;
    const ok = await copyToClipboard(generateTextReport(report, messages.report));
    setNotice(ok ? messages.report.copied : messages.report.copyFailed);
    setTimeout(() => setNotice(''), 2000);
  }, [report, messages]);

  if (error) {
    return (
      <div className="card-sm py-8 text-center">
        <Icon name="lucide:frown" size={36} className="mx-auto mb-2 text-slate-300" />
        <p className="text-sm text-slate-500">{messages.report.loadFailed}</p>
      </div>
    );
  }

  if (!report || !records) {
    return (
      <div className="card-sm py-8 text-center">
        <div className="loading-icon mx-auto mb-3 h-10 w-10">
          <Icon name="lucide:bar-chart-2" size={20} className="text-primary-600" />
        </div>
        <p className="text-sm text-slate-500">{messages.report.loading}</p>
      </div>
    );
  }

  const sortedRecords = [...records].sort(
    (a, b) => a.student.seatNumber - b.student.seatNumber
  );

  return (
    <div className="space-y-4">
      {/* 匯出 */}
      <div className="flex items-center justify-end gap-2">
        {notice && <span className="text-xs font-medium text-emerald-600">{notice}</span>}
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Icon name="lucide:copy" size={14} />
          {messages.report.copyText}
        </Button>
        <Button variant="outline" size="sm" onClick={() => printReport(report, messages.report)}>
          <Icon name="lucide:printer" size={14} />
          {messages.report.print}
        </Button>
      </div>

      {/* 摘要 */}
      {isGrade ? (
        <div className="rounded-xl border-2 border-black bg-slate-50 p-4 text-center">
          <div className="text-3xl font-bold text-slate-900">
            {report.recorded}/{report.total}
          </div>
          <div className="text-sm text-slate-600">
            {messages.report.recorded(report.recorded, report.total)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border-2 border-black bg-green-100 p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{report.recorded}</div>
            <div className="text-xs text-green-800">{messages.report.submitted}</div>
          </div>
          <div className="rounded-xl border-2 border-black bg-red-100 p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{report.total - report.recorded}</div>
            <div className="text-xs text-red-800">{messages.report.notSubmitted}</div>
          </div>
          <div className="rounded-xl border-2 border-black bg-slate-100 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {report.total > 0 ? Math.round((report.recorded / report.total) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-600">{messages.report.submissionRate}</div>
          </div>
        </div>
      )}

      {/* 登記明細（含登記者座號、登記時間） */}
      <div className="card-sm">
        <h3 className="card-title">{messages.teacher.taskDetail.registrationList}</h3>
        {sortedRecords.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {messages.teacher.taskDetail.noRecordsYet}
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedRecords.map((r) => (
              <li
                key={r.studentId}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border-2 border-black bg-white px-3 py-2.5"
              >
                <span className="seat-chip">{r.student.seatNumber}</span>
                <span className="text-sm font-medium text-slate-900">
                  {r.student.name}
                  {r.student.isRemoved && (
                    <span className="text-slate-400">
                      {messages.teacher.studentList.removedSuffix}
                    </span>
                  )}
                </span>
                <span className="ml-auto text-sm font-bold text-slate-900">
                  {isGrade
                    ? (r.gradeValue ?? '—')
                    : r.submissionStatus === SubmissionStatus.SUBMITTED
                      ? messages.report.resultSubmitted
                      : messages.report.resultNotSubmitted}
                </span>
                <span className="flex w-full items-center gap-2 text-xs text-slate-400">
                  <span>{messages.teacher.taskDetail.recordedBy(r.recorderSeatNumber)}</span>
                  <span>·</span>
                  <span>{formatDateTime(new Date(r.updatedAt))}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 未登記學生 */}
      <div className="card-sm">
        <h3 className="card-title">{messages.teacher.taskDetail.unrecordedList}</h3>
        {unrecorded.length === 0 ? (
          <div className="rounded-xl border-2 border-black bg-green-100 p-4 text-center">
            <div className="mb-1 text-2xl">🎉</div>
            <p className="text-sm font-bold text-green-800">
              {messages.teacher.taskDetail.allRecorded}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {unrecorded.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 py-2 text-sm"
              >
                <span className="seat-chip">{s.seatNumber}</span>
                <span className="truncate text-slate-700">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
