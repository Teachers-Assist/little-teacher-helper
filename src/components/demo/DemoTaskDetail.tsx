'use client';

// 006 示範沙盒——老師端任務細節頁（自寫平行版，不碰正式 TaskResultView / D1）。
//
// 為什麼平行而非重用 TaskResultView：後者 useEffect fetch `/api/records`（碰 D1，違反 ISO-2），
// 且經手鏈子元件 HandlerTrail 未匯出。此處沿用其視覺語言與既有 i18n（teacher.taskDetail.* /
// report.*），但資料源為 demo store（sessionStorage）。展示招牌特色「多人經手」（004 US4）：
// 同一筆記錄被 ≥2 個不同座號經手時標琥珀 badge、可展開經手順序。

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SubmissionStatus, TaskType } from '@/types';
import type { Student, Task } from '@/types';
import type { DemoHandler } from '@/lib/demo/seed';
import { useDemoRecords, useDemoHandlers } from '@/lib/demo/store';
import { formatDateTime } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

/**
 * 經手鏈呈現（比照 TaskResultView.HandlerTrail）：顯示最後一手座號與時間；名單含 ≥2 個
 * 不同座號時標「多人經手」（琥珀），可展開完整順序名單（各座號 + 時間）。
 */
function DemoHandlerTrail({ handlers }: { handlers: DemoHandler[] }) {
  const messages = useMessages();
  const [open, setOpen] = useState(false);
  if (handlers.length === 0) return null;
  const last = handlers[handlers.length - 1];
  const multi = new Set(handlers.map((h) => h.seatNumber)).size >= 2;

  return (
    <div className="w-full text-xs">
      <div className="flex flex-wrap items-center gap-2 text-slate-400">
        <span>{messages.teacher.taskDetail.recordedBy(last.seatNumber)}</span>
        <span>·</span>
        <span>{formatDateTime(new Date(last.handledAt))}</span>
        {multi && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700"
          >
            <Icon name="lucide:users" size={12} />
            {messages.teacher.taskDetail.multiHandler}
            <Icon name={open ? 'lucide:chevron-up' : 'lucide:chevron-down'} size={12} />
          </button>
        )}
      </div>
      {multi && open && (
        <ol className="mt-1.5 space-y-0.5 border-l-2 border-amber-200 pl-3">
          {handlers.map((h, i) => (
            <li key={i} className="text-slate-500">
              {/* 刪除也是一手（FR-093a），比照 TaskResultView 分開敘述 */}
              {h.action === 'DELETE'
                ? messages.teacher.taskDetail.handlerChainDeletedAt(
                    h.seatNumber,
                    formatDateTime(new Date(h.handledAt))
                  )
                : messages.teacher.taskDetail.handlerChainAt(
                    h.seatNumber,
                    formatDateTime(new Date(h.handledAt))
                  )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

interface DemoTaskDetailProps {
  task: Task;
  students: Student[];
  onBack: () => void;
}

export function DemoTaskDetail({ task, students, onBack }: DemoTaskDetailProps) {
  const messages = useMessages();
  const td = messages.teacher.taskDetail;
  const report = messages.report;
  const records = useDemoRecords(task.id);
  const handlers = useDemoHandlers(task.id);
  const isGrade = task.type === TaskType.GRADE;

  const roster = [...students].sort((a, b) => a.seatNumber - b.seatNumber);
  const recordedCount = roster.filter((s) =>
    isGrade
      ? records[s.id]?.gradeValue != null
      : records[s.id]?.submissionStatus === SubmissionStatus.SUBMITTED
  ).length;
  const total = roster.length;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600"
      >
        <Icon name="lucide:arrow-left" size={15} />
        {messages.task.backToList}
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">{task.name}</h2>
        <StatusBadge variant={isGrade ? 'info' : 'neutral'} size="sm">
          {isGrade ? messages.task.typeGrade : messages.task.typeSubmission}
        </StatusBadge>
      </div>

      {/* 摘要 */}
      {isGrade ? (
        <div className="rounded-xl border-2 border-black bg-slate-50 p-4 text-center">
          <div className="text-3xl font-bold text-slate-900">
            {recordedCount}/{total}
          </div>
          <div className="text-sm text-slate-600">{report.recorded(recordedCount, total)}</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border-2 border-black bg-green-100 p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{recordedCount}</div>
            <div className="text-xs text-green-800">{report.submitted}</div>
          </div>
          <div className="rounded-xl border-2 border-black bg-red-100 p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{total - recordedCount}</div>
            <div className="text-xs text-red-800">{report.notSubmitted}</div>
          </div>
          <div className="rounded-xl border-2 border-black bg-slate-100 p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {total > 0 ? Math.round((recordedCount / total) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-600">{report.submissionRate}</div>
          </div>
        </div>
      )}

      {/* 登記明細（全班；已登記者附登記者/時間與經手鏈） */}
      <div className="card-sm">
        <h3 className="card-title">{td.registrationList}</h3>
        {isGrade && recordedCount === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{td.noRecordsYet}</p>
        ) : (
          <ul className="space-y-2">
            {roster.map((s) => {
              const rec = records[s.id];
              const submitted = rec?.submissionStatus === SubmissionStatus.SUBMITTED;
              const chain = handlers[s.id] ?? [];
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border-2 border-black bg-white px-3 py-2.5"
                >
                  <span className="seat-chip">{s.seatNumber}</span>
                  <span className="text-sm font-medium text-slate-900">{s.name}</span>
                  {isGrade ? (
                    <span className="ml-auto text-sm font-bold text-slate-900">
                      {rec?.gradeValue ?? '—'}
                    </span>
                  ) : (
                    <StatusBadge
                      variant={submitted ? 'success' : 'neutral'}
                      size="sm"
                      className="ml-auto"
                    >
                      {submitted ? report.resultSubmitted : report.resultNotSubmitted}
                    </StatusBadge>
                  )}
                  {rec && <DemoHandlerTrail handlers={chain} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default DemoTaskDetail;
