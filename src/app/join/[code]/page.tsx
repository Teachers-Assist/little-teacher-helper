'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { SeatSelector } from '@/components/SeatSelector';
import { Student, Task } from '@/types';
import { saveRoom, saveStudents, saveTasks } from '@/lib/offline/storage';
import { useMessages } from '@/i18n/MessagesProvider';
import { resolveError } from '@/i18n/resolveError';

interface RoomJoinData {
  room: { id: string; name: string; code: string };
  students: Student[];
  tasks: Task[];
}

export default function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const messages = useMessages();
  const [data, setData] = useState<RoomJoinData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const joinRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/join/${code.toUpperCase()}`);
        const result = await response.json();
        if (!response.ok) {
          setError(result.error ? resolveError(messages, result.error) : messages.join.joinFailed);
          return;
        }
        setData(result);
      } catch (err) {
        console.error('Failed to join room:', err);
        setError(messages.common.networkError);
      } finally {
        setIsLoading(false);
      }
    };
    joinRoom();
  }, [code, messages]);

  const handleSelectSeat = (student: { seatNumber: number }) => {
    if (!data) return;
    // 以選定座號寫入本機快取，再進入任務清單
    saveRoom(data.room.id, data.room, student.seatNumber);
    saveStudents(data.room.id, data.students);
    saveTasks(data.room.id, data.tasks);
    router.push(`/helper/${data.room.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="loading-icon mb-3 h-12 w-12">
            <Icon name="lucide:search" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">{messages.join.joining}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50 px-4">
        <div className="card w-full max-w-sm text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <Icon name="lucide:alert-circle" size={24} className="text-red-500" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">{messages.join.joinFailedTitle}</h2>
          <p className="mb-5 text-sm text-slate-500">{error}</p>
          <Link href="/join">
            <Button variant="primary" className="w-full">{messages.join.reenterCode}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50 px-4 py-8">
      <div className="card w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Icon name="lucide:check-circle-2" size={24} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{messages.join.joinSuccess}</h2>
          <p className="mt-1 text-sm font-medium text-primary-700">{data.room.name}</p>
        </div>

        <SeatSelector students={data.students} onSelect={handleSelectSeat} />
      </div>
    </div>
  );
}
