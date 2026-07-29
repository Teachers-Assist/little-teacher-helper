'use client';

// 006 示範沙盒——小老師端示範（US3 登記 + US4 跨視窗同步 / T614-T617）。
// 頂部明示「這是模擬掃碼後的畫面」；重用正式 RecordForm 做登記，資料源為 demo store。
// 由 /demo「用新視窗模擬小老師端」以 window.open 開啟（?sid= 供跨視窗頻道）。

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RecordForm, type RecordValueMap } from '@/components/RecordForm';
import { SubmissionStatus, TaskType } from '@/types';
import type { OfflineRecordEntry } from '@/types';
import { useMessages } from '@/i18n/MessagesProvider';
import { createDemoChannel } from '@/lib/demo/channel';
import {
  useDemoTasks,
  useDemoStudents,
  useDemoTask,
  useDemoRecords,
  useDemoSeat,
  useDemoSyncStatus,
  upsertDemoRecord,
  setDemoBroadcaster,
} from '@/lib/demo/store';

export default function DemoHelperPage() {
  const { demo, task: taskMsg } = useMessages();
  const tasks = useDemoTasks();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 接跨視窗頻道：登記變更 broadcast 給老師端視窗（sid 由開窗 URL 帶入；US4）。
  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get('sid');
    if (!sid) return;
    const channel = createDemoChannel(sid);
    setDemoBroadcaster((taskId, records) =>
      channel.post({ type: 'RECORDS_SYNCED', taskId, records })
    );
    return () => {
      setDemoBroadcaster(null);
      channel.close();
    };
  }, []);

  return (
    <div className="lp-body-narrow">
      {/* 模擬說明（明示這是模擬掃碼後的小老師端，此視窗代表一台學生平板） */}
      <div className="mb-3 flex items-start gap-2 rounded-xl border-2 border-black bg-primary-50 px-4 py-3">
        <Icon name="lucide:info" size={17} className="mt-px shrink-0 text-primary-600" />
        <p className="text-xs leading-relaxed text-primary-800">{demo.helper.simNotice}</p>
      </div>

      {/* 特色 hint：引導親自關網 → 登記 → 重整 → 重連（US4 / US6） */}
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-accent-100 px-3 py-2">
        <Icon name="lucide:lightbulb" size={15} className="mt-px shrink-0 text-amber-500" />
        <p className="text-xs leading-snug text-slate-700">{demo.hint.offline}</p>
      </div>

      {selectedId ? (
        <DemoRecordPanel taskId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <>
          <h1 className="mb-3 text-lg font-bold text-slate-900">{taskMsg.listTitle}</h1>
          <div className="space-y-2">
            {tasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className="card-sm card-hover flex w-full items-center justify-between text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{t.name}</p>
                  <span className="badge badge-md badge-neutral mt-1">
                    {t.type === TaskType.SUBMISSION ? taskMsg.typeSubmission : taskMsg.typeGrade}
                  </span>
                </div>
                <Icon name="lucide:chevron-right" size={18} className="shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** demo 待同步指示（重用 SyncIndicator 的 amber 待上傳視覺；離線登記時才顯示）。 */
function DemoSyncIndicator() {
  const { sync } = useMessages();
  const { pendingCount } = useDemoSyncStatus();
  if (pendingCount === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2">
      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
      <span className="text-sm text-slate-600">{sync.pending(pendingCount)}</span>
    </div>
  );
}

function valuesFromRecords(records: {
  [studentId: string]: OfflineRecordEntry;
}): RecordValueMap {
  const map: RecordValueMap = {};
  Object.entries(records).forEach(([studentId, entry]) => {
    map[studentId] = { submissionStatus: entry.submissionStatus, gradeValue: entry.gradeValue };
  });
  return map;
}

function DemoRecordPanel({ taskId, onBack }: { taskId: string; onBack: () => void }) {
  const { task: taskMsg } = useMessages();
  const task = useDemoTask(taskId);
  const students = useDemoStudents();
  const records = useDemoRecords(taskId);
  const seat = useDemoSeat();

  if (!task) return null;
  const values = valuesFromRecords(records);
  const isAssigned = task.assignedSeatNumber === seat;
  const now = () => new Date().toISOString();

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600"
      >
        <Icon name="lucide:arrow-left" size={15} />
        {taskMsg.backToList}
      </button>

      <DemoSyncIndicator />

      <RecordForm
        task={task}
        students={students}
        mySeatNumber={seat}
        values={values}
        lockReason={null}
        onToggleSubmission={(studentId, submitted) =>
          upsertDemoRecord(
            taskId,
            studentId,
            submitted
              ? {
                  submissionStatus: SubmissionStatus.SUBMITTED,
                  recorderSeatNumber: seat,
                  isAssignedRecorder: isAssigned,
                  updatedAt: now(),
                }
              : null
          )
        }
        onChangeGrade={(studentId, grade) =>
          upsertDemoRecord(
            taskId,
            studentId,
            grade == null
              ? null
              : {
                  gradeValue: grade,
                  recorderSeatNumber: seat,
                  isAssignedRecorder: isAssigned,
                  updatedAt: now(),
                }
          )
        }
        onMarkComplete={() => {}}
      />
    </div>
  );
}
