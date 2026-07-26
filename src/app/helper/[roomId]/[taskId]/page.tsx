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
import { queueRecordUpdate, resetRetryJudgment } from '@/lib/offline/queue';
import { requestSync } from '@/lib/offline/syncController';
import { useOfflineRoom, useOfflineStudents, useOfflineTask, useOfflineRecords } from '@/lib/offline/store';
import { getTaskLockReason } from '@/lib/task';
import { useMessages } from '@/i18n/MessagesProvider';
import { useToast } from '@/components/ui/Toast';

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
  const toast = useToast();
  // 單一真相：座號、任務、學生、登記值全部讀自離線 store；登記寫入後畫面自動更新
  const room = useOfflineRoom(roomId);
  const task = useOfflineTask(roomId, taskId);
  const students = useOfflineStudents(roomId);
  const records = useOfflineRecords(taskId, task?.assignedSeatNumber);
  const [isLoading, setIsLoading] = useState(true);
  // US5：載入失敗成因，用於顯示對的對話（非一律「找不到班級」）。
  // 'gone'=任務被刪/封存；'network'=連線問題；'server'=伺服器錯誤；null=正常。
  const [loadError, setLoadError] = useState<'gone' | 'network' | 'server' | null>(null);
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
          if (taskRes.ok) {
            const t = (await taskRes.json()) as Task & { isArchived?: boolean };
            if (t.isArchived) {
              // 封存＝老師把任務收起來了（FR-098）
              if (active) setLoadError('gone');
            } else {
              saveTask(roomId, t);
              if (active) setLoadError(null);
            }
          } else if (taskRes.status === 404) {
            if (active) setLoadError('gone'); // 任務被老師刪除
          } else {
            if (active) setLoadError('server'); // 伺服器錯誤（學生端兒童語氣，T325）
          }
          if (studentsRes.ok) saveStudents(roomId, await studentsRes.json());
          if (recordsRes.ok) {
            // 回寫已同步記錄到本機（store），畫面 values 隨之更新並供離線檢視
            cacheSyncedRecords(taskId, (await recordsRes.json()) as RecordApiItem[]);
          }
        } catch (error) {
          console.error('Failed to load task:', error);
          // 斷線且本機無此任務快取才報連線問題；有快取則沿用離線資料（不打斷離線登記）
          if (active && !task && room) setLoadError('network');
        }
      } else if (!task && room) {
        // 離線且無快取（但已加入班級）→ 連線問題（FR-099）
        if (active) setLoadError('network');
      }
      // 頁面載入：重置重試判定（retryCount / nonRetryable）並觸發一次同步（FR-079 / INV-2）。
      // 卡住的登記（含老師重新開放任務後）重整即自動重送；未送出資料一律保留、不清除。
      resetRetryJudgment();
      void requestSync();
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
      // 驗證失敗（不該發生，GradeRow 已擋）→ 告知，不靜默 return（FR-087）
      if (!result.ok) {
        toast.error(messages.record.saveFailed);
        return;
      }
      // 存不下來（無痕 / 配額爆）→ 告知但不阻擋操作（FR-090/091）
      if (result.stored === false) {
        toast.warning(messages.record.storageFull);
      }

      if (isOnline) requestSync();
    },
    [task, seatNumber, isOnline, toast, messages]
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
        // 臉 D：用伺服器回應更新，MUST NOT 用 await 前的閉包 task 拼（避免陳舊快照回捲，INV-4）
        saveTask(roomId, (await res.json()) as Task);
      } else {
        // 非 2xx（伺服器回應了但失敗）→ 告知；按鈕未鎖定，仍可再按（AS2）
        toast.error(messages.record.markCompleteFailedOther);
      }
    } catch (error) {
      // 拋錯通常是斷線 → 區分「沒網路」文案（AS3）
      console.error('Failed to mark complete:', error);
      toast.error(messages.record.markCompleteFailedNetwork);
    }
  }, [task, roomId, taskId, toast, messages]);

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

  // US5：依成因顯示對的對話（任務被收起來 / 連線問題 / 伺服器錯誤），優先於「找不到班級」。
  // 出口一律回任務清單，MUST NOT 以「重新掃碼」為主要行動（AS2）。
  if (loadError) {
    const { icon, text } =
      loadError === 'gone'
        ? { icon: 'lucide:package', text: messages.task.taskRemovedByTeacher }
        : loadError === 'network'
          ? { icon: 'lucide:wifi-off', text: messages.common.networkError }
          : { icon: 'lucide:frown', text: messages.common.errorChild };
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6 text-center">
        <Icon name={icon} size={40} className="mb-3 text-slate-300" />
        <p className="mb-4 text-slate-600">{text}</p>
        <Link href={`/helper/${roomId}`}>
          <Button variant="primary" size="sm">{messages.common.back}</Button>
        </Link>
      </div>
    );
  }

  // 本機無此任務快取且非上述成因（未加入班級 / 已清除快取）→ 才顯示「找不到班級」（FR-100）
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
