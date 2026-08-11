'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { TaskList } from '@/components/TaskList';
import { RecorderBadge } from '@/components/RecorderBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NetworkStatus } from '@/components/NetworkStatus';
import { SyncIndicator } from '@/components/SyncIndicator';
import { Task } from '@/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getRoom, saveTasks, saveStudents, clearRoom } from '@/lib/offline/storage';
import { primeOfflineDocs } from '@/lib/offline/primeShell';
import { isServerReachable } from '@/lib/offline/connectivity';
import { useOfflineRoom, useOfflineTasks } from '@/lib/offline/store';
import { useMessages } from '@/i18n/MessagesProvider';
import { useToast } from '@/components/ui/Toast';

export default function HelperRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const messages = useMessages();
  // 單一真相：房間與任務直接讀自離線 store，寫入後畫面自動更新（不再各持 useState 副本）
  const room = useOfflineRoom(roomId);
  const tasks = useOfflineTasks(roomId);
  const [isLoading, setIsLoading] = useState(true);
  // US5：清單載入失敗成因（僅在無快取任務可顯示時才呈現，否則沿用離線快取）。
  const [refreshError, setRefreshError] = useState<'network' | 'server' | null>(null);
  const { isOnline } = useNetworkStatus();
  const router = useRouter();
  const toast = useToast();
  const [changeSeatOpen, setChangeSeatOpen] = useState(false);

  // 點登記者身份 → 換座號（重新進入房間）：清本機 cache 後跳 /join（US4 / FR-074-075）。
  // 離線 gate（2026-08-05）：離線 MUST NOT 觸發（不 clearRoom、不導 /join），保留防禦性 guard。
  const handleChangeSeat = async () => {
    // 破壞性動作前實際探測伺服器（navigator.onLine 不可靠，見 connectivity.ts）：連不到就不清資料、
    // 不導頁，避免在 lie-fi 下清空本機班級後卡在 /join。
    if (!(await isServerReachable())) {
      setChangeSeatOpen(false);
      toast.info(messages.room.changeSeatOfflineHint);
      return;
    }
    clearRoom(roomId);
    router.push('/join');
  };

  // 點「登記者：」badge：探測實際連線（非 navigator.onLine）才開換座號對話框；連不到只提示、留在原頁。
  const handleChangeSeatTap = async () => {
    if (!(await isServerReachable())) {
      toast.info(messages.room.changeSeatOfflineHint);
      return;
    }
    setChangeSeatOpen(true);
  };

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setRefreshError(null);
    // 以非反應式讀取判斷是否已加入房間，避免依賴反應式 room 造成重複 fetch
    if (getRoom(roomId) && isOnline) {
      try {
        const [tasksRes, studentsRes] = await Promise.all([
          fetch(`/api/tasks/${roomId}`),
          fetch(`/api/rooms/${roomId}/students`),
        ]);
        if (tasksRes.ok) {
          saveTasks(roomId, (await tasksRes.json()) as Task[]);
        } else {
          setRefreshError('server');
        }
        if (studentsRes.ok) {
          saveStudents(roomId, await studentsRes.json());
        }
      } catch (error) {
        // 斷線：有快取任務則沿用（離線優先）；下方 render 只在無任務可顯示時才報連線問題
        console.error('Failed to refresh tasks:', error);
        setRefreshError('network');
      }
    }
    setIsLoading(false);
  }, [roomId, isOnline]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 離線文件預熱（2026-08-05）：連線時把本清單頁與各任務頁的 SSR 文件請 SW 先快取，
  // 讓學生斷網後仍能進任一任務 / 回列表 / 硬重整（見 src/lib/offline/primeShell.ts）。
  const taskIdsKey = tasks.map((t) => t.id).join(',');
  useEffect(() => {
    if (!isOnline) return;
    primeOfflineDocs([
      `/helper/${roomId}`,
      ...tasks.map((t) => `/helper/${roomId}/${t.id}`),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isOnline, taskIdsKey]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="loading-icon mb-3 h-12 w-12">
            <Icon name="lucide:clipboard-list" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">{messages.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!room || room.seatNumber == null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6">
        <Icon name="lucide:frown" size={40} className="mb-3 text-slate-300" />
        <p className="mb-4 text-slate-600">{messages.room.notFoundTitle}</p>
        <Link href="/join">
          <Button variant="primary" size="sm">
            {messages.room.rejoin}
          </Button>
        </Link>
      </div>
    );
  }

  // US5：已加入班級，但線上更新失敗且本機沒有任務可顯示 → 區分連線 / 伺服器問題（FR-101），
  // 不落入「還沒有任務」空狀態。有快取任務時沿用離線資料、不打斷（不進此分支）。
  if (refreshError && tasks.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6 text-center">
        <Icon
          name={refreshError === 'network' ? 'lucide:wifi-off' : 'lucide:frown'}
          size={40}
          className="mb-3 text-slate-300"
        />
        <p className="mb-4 text-slate-600">
          {refreshError === 'network' ? messages.common.networkError : messages.common.errorChild}
        </p>
        <Button variant="primary" size="sm" onClick={refresh}>
          {messages.common.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-24">
      <div className="lp-header">
        <div
          className="lp-body-narrow"
          style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}
        >
          <Link href="/join" className="mb-1.5 link-back">
            <Icon name="lucide:arrow-left" size={13} />
            {messages.room.leave}
          </Link>
          <h1 className="text-lg font-bold text-slate-900">{room.name}</h1>
          <p className="mt-0.5 text-xs text-slate-500">{messages.task.listTitle}</p>
        </div>
      </div>

      <div className="lp-body-narrow">
        <div className="mb-4">
          <SyncIndicator />
        </div>

        {/* 登記者身份（常駐、可點換座號）— 與 RecordForm 一致（FR-070/071/074） */}
        <div className="mb-3">
          <RecorderBadge
            seatNumber={room.seatNumber}
            assignmentState="noAssignment"
            onClick={handleChangeSeatTap}
          />
        </div>

        <TaskList roomId={roomId} tasks={tasks} mySeatNumber={room.seatNumber} />

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
