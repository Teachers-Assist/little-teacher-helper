'use client';

// 006 推廣示範沙盒——老師端示範舞台（T606 標示帶 + US2 班級狀況/三任務/異常）。
// 顯示 QRCode（US3）、特色 hint（US6）、建班邀請（US5）於後續 task 接入。
// 獨立入口，MUST NOT 寫 teacherId（FR-142）；資料源為 demo store（sessionStorage）。

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MonitoringStats } from '@/components/MonitoringStats';
import { DemoQrModal } from '@/components/demo/DemoQrModal';
import { DemoTaskDetail } from '@/components/demo/DemoTaskDetail';
import { createDemoChannel, type DemoChannel } from '@/lib/demo/channel';
import { useMessages } from '@/i18n/MessagesProvider';
import { TaskType } from '@/types';
import type { Anomaly } from '@/lib/anomalyDetection';
import {
  applyDemoIncoming,
  resetDemo,
  useDemoRoom,
  useDemoStudents,
  useDemoTeacherView,
} from '@/lib/demo/store';

export default function DemoPage() {
  const { demo, teacher } = useMessages();

  return (
    <div className="mx-auto w-full max-w-[1120px] sm:border-x-2 sm:border-black">
      {/* 常駐示範模式標示帶（安全說明；與特色 hint、建班邀請視覺分離） */}
      <div className="flex flex-col gap-2.5 border-b-2 border-black bg-accent-400 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-start gap-2">
          <Icon name="lucide:info" size={18} className="mt-px shrink-0 text-black" />
          <p className="text-xs font-medium leading-snug text-slate-900 sm:text-sm">
            <strong className="font-black">{demo.banner.title}</strong>
            <span className="mx-1.5 text-slate-700">·</span>
            {demo.banner.desc}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetDemo}>
            <Icon name="lucide:rotate-ccw" size={15} />
            {demo.banner.restart}
          </Button>
          <Link href="/teacher">
            <Button variant="primary" size="sm">
              {teacher.createRoom}
            </Button>
          </Link>
        </div>
      </div>

      {/* 示範舞台內容 */}
      <div className="px-4 py-6 sm:px-10 sm:py-8">
        <DemoTeacherStage />
      </div>
    </div>
  );
}

function anomalyText(
  a: Anomaly,
  cs: ReturnType<typeof useMessages>['teacher']['classStatus']
): string {
  if (a.type === 'TASK_STALLED') {
    const hours = a.idleMs ? Math.floor(a.idleMs / (60 * 60 * 1000)) : 0;
    return cs.anomalyIdle(hours);
  }
  if (a.type === 'LOW_COMPLETION') {
    return cs.anomalyLowCompletion(a.recordedCount ?? 0, a.classStudentCount ?? 0);
  }
  const due = '';
  return cs.anomalyNearDue(due);
}

function DemoTeacherStage() {
  const messages = useMessages();
  const toast = useToast();
  const cs = messages.teacher.classStatus;
  const room = useDemoRoom();
  const students = useDemoStudents();
  const { stats, taskStats } = useDemoTeacherView();
  const warnings = taskStats.filter((t) => t.anomalies.length > 0);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const sidRef = useRef<string | null>(null);
  const channelRef = useRef<DemoChannel | null>(null);

  const selectedTask = selectedTaskId
    ? taskStats.find((t) => t.task.id === selectedTaskId)?.task ?? null
    : null;

  // 老師端視窗關閉時關閉頻道。
  useEffect(() => () => channelRef.current?.close(), []);

  // 開新視窗模擬小老師端；sid 在事件內產生（非 render），經 URL 傳給 helper 視窗共用頻道。
  // 同時建立老師端接收頻道：收到小老師端 broadcast 即套入本視窗 records（US4）。
  const handleOpenHelper = () => {
    if (!sidRef.current) sidRef.current = crypto.randomUUID();
    if (!channelRef.current) {
      channelRef.current = createDemoChannel(sidRef.current, (msg) => {
        if (msg.type === 'RECORDS_SYNCED')
          applyDemoIncoming(msg.taskId, msg.records, msg.handlers);
      });
    }
    const win = window.open(
      `/demo/helper?sid=${sidRef.current}`,
      'demo-helper',
      'width=430,height=850,left=120,top=80'
    );
    if (!win) toast.error(messages.demo.qr.popupBlocked);
    else setQrOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">{room.name}</h1>
        <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)}>
          <Icon name="lucide:qr-code" size={15} />
          {messages.teacher.qrcode.showButton}
        </Button>
      </div>

      {selectedTask ? (
        <DemoTaskDetail
          task={selectedTask}
          students={students}
          onBack={() => setSelectedTaskId(null)}
        />
      ) : (
        <DemoTeacherOverview
          stats={stats}
          taskStats={taskStats}
          warnings={warnings}
          cs={cs}
          onSelectTask={setSelectedTaskId}
        />
      )}

      <DemoQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onOpenHelper={handleOpenHelper}
      />
    </div>
  );
}

interface DemoTeacherOverviewProps {
  stats: ReturnType<typeof useDemoTeacherView>['stats'];
  taskStats: ReturnType<typeof useDemoTeacherView>['taskStats'];
  warnings: ReturnType<typeof useDemoTeacherView>['taskStats'];
  cs: ReturnType<typeof useMessages>['teacher']['classStatus'];
  onSelectTask: (taskId: string) => void;
}

function DemoTeacherOverview({
  stats,
  taskStats,
  warnings,
  cs,
  onSelectTask,
}: DemoTeacherOverviewProps) {
  const messages = useMessages();
  return (
    <>
      <MonitoringStats stats={stats} />

      {/* 異常提醒（由真實 detectAnomalies 算出） */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <Icon name="lucide:alert-triangle" size={15} className="text-red-500" />
            {cs.alertsTitle}
          </h3>
          {warnings.map((w) => (
            <div
              key={w.task.id}
              className="flex items-center gap-3 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3"
            >
              <Icon name="lucide:alert-triangle" size={18} className="shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{w.task.name}</p>
                <ul className="mt-0.5 space-y-0.5">
                  {w.anomalies.map((a, i) => (
                    <li key={i} className="text-xs text-red-700">
                      {anomalyText(a, cs)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 三任務：點入看細節頁（登記明細 + 多人經手） */}
      <div className="space-y-2">
        {taskStats.map(({ task, recordedCount, studentCount }) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelectTask(task.id)}
            className="card-sm card-hover flex w-full items-center justify-between text-left"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{task.name}</p>
              <span className="badge badge-md badge-neutral mt-1">
                {task.type === TaskType.SUBMISSION
                  ? messages.task.typeSubmission
                  : messages.task.typeGrade}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Icon name="lucide:users" size={15} className="text-slate-400" />
              {recordedCount}/{studentCount}
              <Icon name="lucide:chevron-right" size={16} className="text-slate-400" />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
