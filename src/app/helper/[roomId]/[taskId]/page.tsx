'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { RecordForm, RecordValueMap } from '@/components/RecordForm';
import { NetworkStatus } from '@/components/NetworkStatus';
import { SyncIndicator } from '@/components/SyncIndicator';
import { Student, Task, TaskStatus, SubmissionStatus } from '@/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getRoom, getStudents, getTasks, getRecords, cacheSyncedRecords } from '@/lib/offline/storage';
import { queueRecordUpdate, processSyncQueue } from '@/lib/offline/queue';
import { getTaskLockReason } from '@/lib/task';
import { messages } from '@/messages/zh-TW';

interface RecordApiItem {
  studentId: string;
  submissionStatus?: SubmissionStatus | null;
  gradeValue?: number | null;
  recorderSeatNumber: number;
  isAssignedRecorder: boolean;
  updatedAt?: string;
}

function valuesFromRecords(records: { [studentId: string]: { submissionStatus?: SubmissionStatus; gradeValue?: number } }): RecordValueMap {
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
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [values, setValues] = useState<RecordValueMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const load = async () => {
      const room = getRoom(roomId);
      if (room) setSeatNumber(room.seatNumber);
      setStudents(getStudents(roomId));
      setTask(getTasks(roomId).find((t) => t.id === taskId) ?? null);
      setValues(valuesFromRecords(getRecords(taskId)));

      if (isOnline) {
        try {
          const [taskRes, recordsRes, studentsRes] = await Promise.all([
            fetch(`/api/tasks/${roomId}/${taskId}`),
            fetch(`/api/records?taskId=${taskId}`),
            fetch(`/api/rooms/${roomId}/students`),
          ]);
          if (taskRes.ok) setTask(await taskRes.json());
          if (studentsRes.ok) setStudents(await studentsRes.json());
          if (recordsRes.ok) {
            const rows = (await recordsRes.json()) as RecordApiItem[];
            const map: RecordValueMap = {};
            rows.forEach((r) => {
              map[r.studentId] = {
                submissionStatus: r.submissionStatus ?? undefined,
                gradeValue: r.gradeValue ?? undefined,
              };
            });
            setValues(map);
            // 回寫已同步記錄到本機，供之後離線檢視
            cacheSyncedRecords(taskId, rows);
          }
        } catch (error) {
          console.error('Failed to load task:', error);
        }
      }
      setIsLoading(false);
    };
    load();
  }, [roomId, taskId, isOnline]);

  const persist = useCallback(
    (studentId: string, value: { submissionStatus?: SubmissionStatus; gradeValue?: number | null }) => {
      if (!task || seatNumber == null) return;
      const result = queueRecordUpdate({
        task,
        studentId,
        recorderSeatNumber: seatNumber,
        submissionStatus: value.submissionStatus,
        gradeValue: value.gradeValue,
      });
      if (!result.ok) return;

      // 更新畫面狀態：刪除意圖（取消勾選 / 清空成績）就移除該筆
      setValues((prev) => {
        const next = { ...prev };
        const isDelete =
          value.submissionStatus === SubmissionStatus.NOT_SUBMITTED ||
          value.gradeValue === null ||
          value.gradeValue === undefined;
        if (isDelete && value.submissionStatus !== SubmissionStatus.SUBMITTED) {
          delete next[studentId];
        } else {
          next[studentId] = { submissionStatus: value.submissionStatus, gradeValue: value.gradeValue ?? undefined };
        }
        return next;
      });

      if (isOnline) processSyncQueue();
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
        setTask((prev) => (prev ? { ...prev, status: TaskStatus.HELPER_COMPLETED } : prev));
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
          <Link href={`/helper/${roomId}`} className="mb-1.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600">
            <Icon name="lucide:arrow-left" size={13} />
            {messages.task.listTitle}
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">{task.name}</h1>
            <span className="badge badge-info">{messages.identity.seatLabel(seatNumber)}</span>
          </div>
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
        />

        <NetworkStatus />
      </div>
    </div>
  );
}
