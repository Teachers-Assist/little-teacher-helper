'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Student, Task, TaskType, SubmissionStatus } from '@/types';
import { generateTextReport, printReport, copyToClipboard, ReportData } from '@/lib/report';
import { formatDateTime } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

interface RecordRow {
  studentId: string;
  submissionStatus?: SubmissionStatus | null;
  gradeValue?: number | null;
}

interface ReportViewProps {
  task: Task;
  roomName: string;
  students: Student[];
}

export function ReportView({ task, roomName, students }: ReportViewProps) {
  const messages = useMessages();
  const [records, setRecords] = useState<RecordRow[] | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadedTaskId, setLoadedTaskId] = useState(task.id);

  // Reset to loading state when switching tasks (React's recommended
  // "adjust state during render" pattern, instead of setState inside an effect).
  if (loadedTaskId !== task.id) {
    setLoadedTaskId(task.id);
    setRecords(null);
    setError(false);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/records?taskId=${task.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data: RecordRow[]) => {
        if (active) setRecords(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [task.id]);

  const report: ReportData | null = useMemo(() => {
    if (!records) return null;
    const isGrade = task.type === TaskType.GRADE;
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
  }, [records, students, task.name, task.type, roomName, messages]);

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

  if (!report) {
    return (
      <div className="card-sm py-8 text-center">
        <div className="loading-icon mx-auto mb-3 h-10 w-10">
          <Icon name="lucide:bar-chart-2" size={20} className="text-primary-600" />
        </div>
        <p className="text-sm text-slate-500">{messages.report.loading}</p>
      </div>
    );
  }

  const isGrade = report.type === 'GRADE';
  const notDone = report.rows.filter((r) => !r.done);
  const done = report.rows.filter((r) => r.done);

  return (
    <div className="card-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">{task.name}</h3>
          <StatusBadge variant={isGrade ? 'info' : 'neutral'} size="sm">
            {isGrade ? messages.task.typeGrade : messages.task.typeSubmission}
          </StatusBadge>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Summary */}
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
            <div className="text-2xl font-bold text-green-700">{done.length}</div>
            <div className="text-xs text-green-800">{messages.report.submitted}</div>
          </div>
          <div className="rounded-xl border-2 border-black bg-red-100 p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{notDone.length}</div>
            <div className="text-xs text-red-800">{messages.report.notSubmitted}</div>
          </div>
          <div className="rounded-xl border-2 border-black bg-slate-100 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {report.total > 0 ? Math.round((done.length / report.total) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-600">{messages.report.submissionRate}</div>
          </div>
        </div>
      )}

      {/* Grade list */}
      {isGrade && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {report.rows.map((r) => (
            <div
              key={r.seatNumber}
              className="flex items-center justify-between rounded-lg border-2 border-black bg-white px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="seat-chip">{r.seatNumber}</span>
                <span className="truncate text-slate-700">{r.name}</span>
              </span>
              <span className={r.done ? 'font-bold text-slate-900' : 'text-xs text-slate-400'}>
                {r.result}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Submission lists */}
      {!isGrade && (
        <div className="space-y-4">
          {notDone.length > 0 && (
            <ReportNameGrid title={messages.report.notSubmitted} variant="danger" rows={notDone} />
          )}
          {done.length > 0 && (
            <ReportNameGrid title={messages.report.submitted} variant="success" rows={done} />
          )}
          {notDone.length === 0 && report.total > 0 && (
            <div className="rounded-xl border-2 border-black bg-green-100 p-5 text-center">
              <div className="mb-1 text-3xl">🎉</div>
              <p className="font-bold text-green-800">{messages.report.allSubmitted}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportNameGrid({
  title,
  variant,
  rows,
}: {
  title: string;
  variant: 'success' | 'danger';
  rows: { seatNumber: number; name: string }[];
}) {
  const messages = useMessages();
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
        <StatusBadge variant={variant} size="sm">
          {title}
        </StatusBadge>
        <span className="text-slate-500">
          ({rows.length} {messages.report.unitPerson})
        </span>
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {rows.map((r) => (
          <div
            key={r.seatNumber}
            className="flex items-center gap-1.5 rounded-lg border-2 border-black bg-white px-3 py-2 text-sm"
          >
            <span className="seat-chip">{r.seatNumber}</span>
            <span className="truncate text-slate-700">{r.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportView;
