'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { TaskList } from '@/components/TaskList';
import { NetworkStatus } from '@/components/NetworkStatus';
import { SyncIndicator } from '@/components/SyncIndicator';
import { Task } from '@/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getRoom, getTasks, saveTasks, saveStudents } from '@/lib/offline/storage';
import { messages } from '@/messages/zh-TW';

export default function HelperRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [roomName, setRoomName] = useState('');
  const [seatNumber, setSeatNumber] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const load = async () => {
      const room = getRoom(roomId);
      if (!room) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setRoomName(room.name);
      setSeatNumber(room.seatNumber);
      setTasks(getTasks(roomId));

      if (isOnline) {
        try {
          const [tasksRes, studentsRes] = await Promise.all([
            fetch(`/api/tasks/${roomId}`),
            fetch(`/api/rooms/${roomId}/students`),
          ]);
          if (tasksRes.ok) {
            const fresh = (await tasksRes.json()) as Task[];
            setTasks(fresh);
            saveTasks(roomId, fresh);
          }
          if (studentsRes.ok) {
            saveStudents(roomId, await studentsRes.json());
          }
        } catch (error) {
          console.error('Failed to refresh tasks:', error);
        }
      }
      setIsLoading(false);
    };
    load();
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

  if (notFound || seatNumber == null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6">
        <Icon name="lucide:frown" size={40} className="mb-3 text-slate-300" />
        <p className="mb-4 text-slate-600">{messages.room.notFoundTitle}</p>
        <Link href="/join">
          <Button variant="primary" size="sm">{messages.room.rejoin}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-24">
      <div className="lp-header">
        <div className="lp-body-narrow" style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
          <Link href="/join" className="mb-1.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600">
            <Icon name="lucide:arrow-left" size={13} />
            {messages.room.leave}
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">{roomName}</h1>
            <span className="badge badge-info">{messages.identity.seatLabel(seatNumber)}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{messages.task.listTitle}</p>
        </div>
      </div>

      <div className="lp-body-narrow">
        <div className="mb-4">
          <SyncIndicator />
        </div>

        <TaskList roomId={roomId} tasks={tasks} mySeatNumber={seatNumber} />

        <NetworkStatus />
      </div>
    </div>
  );
}
