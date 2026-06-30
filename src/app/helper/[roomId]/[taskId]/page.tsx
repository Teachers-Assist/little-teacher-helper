'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { RecordForm, RecordValueMap } from '@/components/RecordForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NetworkStatus } from '@/components/NetworkStatus';
import { SyncIndicator } from '@/components/SyncIndicator';
import { Task, TaskStatus, SubmissionStatus, OfflineRecordEntry } from '@/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { saveTask, saveStudents, cacheSyncedRecords, clearRoom } from '@/lib/offline/storage';
import { queueRecordUpdate } from '@/lib/offline/queue';
import { requestSync } from '@/lib/offline/syncController';
import { useOfflineRoom, useOfflineStudents, useOfflineTask, useOfflineRecords } from '@/lib/offline/store';
import { getTaskLockReason } from '@/lib/task';
import { useMessages } from '@/i18n/MessagesProvider';

interface RecordApiItem {
  studentId: string;
  submissionStatus?: SubmissionStatus | null;
  gradeValue?: number | null;
  recorderSeatNumber: number;
  isAssignedRecorder: boolean;
  updatedAt?: string;
}

function valuesFromRecords(records: { [studentId: string]: OfflineRecordEntry }): RecordValueMap {
  const map: RecordValueMap = {};
  Object.entries(records).forEach(([studentId, entry]) => {
    map[studentId] = { submissionStatus: entry.submissionStatus, gradeValue: entry.gradeValue };
  });
  return map;
}

export default function RecordPage({
  params,
}: {
  params: Promise<{ roomId: string; taskId: string }>;
}) {
  const { roomId, taskId } = use(params);
  const messages = useMessages();
  const router = useRouter();
  // 單一真相：座號、任務、學生、登記值全部讀自離線 store；登記寫入後畫面自動更新
  const room = useOfflineRoom(roomId);
  const task = useOfflineTask(roomId, taskId);
  const students = useOfflineStudents(roomId);
  const records = useOfflineRecords(taskId);
  const [isLoading, setIsLoading] = useState(true);
  const [changeSeatOpen, setChangeSeatOpen] = useState(false);
  const { isOnline } = useNetworkStatus();

  // 換座號：清掉本機房間/座號/名單/任務快取（保留未同步登記）後回 /join 重新入場（FR-075）
  const handleChangeSeat = useCallback(() => {
    clearRoom(roomId);
    router.push('/join');
  }, [roomId, router]);

  const seatNumber = room?.seatNumber ?? null;
  const values = useMemo(() => valuesFromRecords(records), [records]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (isOnline) {
        try {
          const [taskRes, recordsRes, studentsRes] = await Promise.all([
            fetch(`/api/tasks/${roomId}/${taskId}`),
            fetch(`/api/records?taskId=${taskId}`),
            fetch(`/api/rooms/${roomId}/students`),
          ]);
          if (taskRes.ok) saveTask(roomId, (await taskRes.json()) as Task);
          if (studentsRes.ok) saveStudents(roomId, await studentsRes.json());
          if (recordsRes.ok) {
            // 回寫已同步記錄到本機（store），畫面 values 隨之更新並供離線檢視
            cacheSyncedRecords(taskId, (await recordsRes.json()) as RecordApiItem[]);
          }
        } catch (error) {
          console.error('Failed to load task:', error);
        }
      }
      if (active) setIsLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [roomId, taskId, isOnline]);

  const persist = useCallback(
    (studentId: string, value: { submissionStatus?: SubmissionStatus; gradeValue?: number | null }) => {
      if (!task || seatNumber == null) return;
      // 寫入 store（依意圖寫入或刪除）＋ 入佇列；畫面 values 由 useOfflineRecords 反應更新
      const result = queueRecordUpdate({
        task,
        studentId,
        recorderSeatNumber: seatNumber,
        submissionStatus: value.submissionStatus,
        gradeValue: value.gradeValue,
      });
      if (!result.ok) return;

      if (isOnline) requestSync();
    },
    [task, seatNumber, isOnline]
  );

  const handleMarkComplete = useCallback(async () => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${roomId}/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: TaskStatus.HELPER_COMPLETED }),
      });
      if (res.ok) {
        saveTask(roomId, { ...task, status: TaskStatus.HELPER_COMPLETED });
      }
    } catch (error) {
      console.error('Failed to mark complete:', error);
    }
  }, [task, roomId, taskId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="loading-icon mb-3 h-12 w-12">
            <Icon name="lucide:pen-line" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">{messages.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!task || seatNumber == null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6">
        <Icon name="lucide:frown" size={40} className="mb-3 text-slate-300" />
        <p className="mb-4 text-slate-600">{messages.room.notFoundTitle}</p>
        <Link href={`/helper/${roomId}`}>
          <Button variant="primary" size="sm">{messages.common.back}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-12">
      <div className="lp-header">
        <div className="lp-body-narrow" style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
          <Link href={`/helper/${roomId}`} className="mb-1.5 link-back">
            <Icon name="lucide:arrow-left" size={13} />
            {messages.task.listTitle}
          </Link>
          <h1 className="text-lg font-bold text-slate-900">{task.name}</h1>
        </div>
      </div>

      <div className="lp-body-narrow space-y-3">
        <SyncIndicator />

        <RecordForm
          task={task}
          students={students}
          mySeatNumber={seatNumber}
          values={values}
          lockReason={getTaskLockReason(task)}
          onToggleSubmission={(studentId, submitted) =>
            persist(studentId, {
              submissionStatus: submitted ? SubmissionStatus.SUBMITTED : SubmissionStatus.NOT_SUBMITTED,
            })
          }
          onChangeGrade={(studentId, grade) => persist(studentId, { gradeValue: grade })}
          onMarkComplete={handleMarkComplete}
          onChangeSeat={() => setChangeSeatOpen(true)}
        />

        <NetworkStatus />
      </div>

      <ConfirmDialog
        open={changeSeatOpen}
        title={messages.room.changeSeatTitle}
        message={messages.room.changeSeatMessage}
        confirmLabel={messages.room.changeSeatConfirm}
        onConfirm={handleChangeSeat}
        onCancel={() => setChangeSeatOpen(false)}
      />
    </div>
  );
}
