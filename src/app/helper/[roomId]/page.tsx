'use client';

import { useState, useEffect, use } from 'react';
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
import { useOfflineRoom, useOfflineTasks } from '@/lib/offline/store';
import { useMessages } from '@/i18n/MessagesProvider';

export default function HelperRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const messages = useMessages();
  // 單一真相：房間與任務直接讀自離線 store，寫入後畫面自動更新（不再各持 useState 副本）
  const room = useOfflineRoom(roomId);
  const tasks = useOfflineTasks(roomId);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useNetworkStatus();
  const router = useRouter();
  const [changeSeatOpen, setChangeSeatOpen] = useState(false);

  // 點登記者身份 → 換座號（重新進入房間）：清本機 cache 後跳 /join（US4 / FR-074-075）
  const handleChangeSeat = () => {
    clearRoom(roomId);
    router.push('/join');
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      // 以非反應式讀取判斷是否已加入房間，避免依賴反應式 room 造成重複 fetch
      if (getRoom(roomId) && isOnline) {
        try {
          const [tasksRes, studentsRes] = await Promise.all([
            fetch(`/api/tasks/${roomId}`),
            fetch(`/api/rooms/${roomId}/students`),
          ]);
          if (tasksRes.ok) {
            saveTasks(roomId, (await tasksRes.json()) as Task[]);
          }
          if (studentsRes.ok) {
            saveStudents(roomId, await studentsRes.json());
          }
        } catch (error) {
          console.error('Failed to refresh tasks:', error);
        }
      }
      if (active) setIsLoading(false);
    };
    refresh();
    return () => {
      active = false;
    };
  }, [roomId, isOnline]);

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
            onClick={() => setChangeSeatOpen(true)}
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
