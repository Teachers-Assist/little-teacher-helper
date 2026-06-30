'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { SeatSelector } from '@/components/SeatSelector';
import { JoinTransition } from '@/components/JoinTransition';
import { IdentityStamp } from '@/components/IdentityStamp';
import { Student, Task } from '@/types';
import { saveRoom, saveStudents, saveTasks } from '@/lib/offline/storage';
import { useMessages } from '@/i18n/MessagesProvider';
import { resolveError } from '@/i18n/resolveError';

interface RoomJoinData {
  room: { id: string; name: string; code: string };
  students: Student[];
  tasks: Task[];
}

/** 過場頁三段狀態（US2）：歡迎過場 → 選座號 → 自我聲明印章 */
type Stage = 'welcoming' | 'seatSelecting' | 'stamping';

export default function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const messages = useMessages();
  const router = useRouter();
  const [data, setData] = useState<RoomJoinData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<Stage>('welcoming');
  const [selected, setSelected] = useState<{ seatNumber: number; name: string } | null>(null);

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

  const handleSelectSeat = (student: { seatNumber: number; name: string }) => {
    setSelected({ seatNumber: student.seatNumber, name: student.name });
    setStage('stamping');
  };

  // 印章結束才寫入本機快取並進入任務清單（沿用既有寫入邏輯）
  const handleStampComplete = () => {
    if (!data || !selected) return;
    saveRoom(data.room.id, data.room, selected.seatNumber);
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

  // 過場：歡迎畫面（大字班名）1.8 秒後自動進選座號
  if (stage === 'welcoming') {
    return <JoinTransition roomName={data.room.name} onComplete={() => setStage('seatSelecting')} />;
  }

  // 自我聲明印章：停 1.5 秒後寫入本機並進任務清單
  if (stage === 'stamping' && selected) {
    return (
      <IdentityStamp
        seatNumber={selected.seatNumber}
        studentName={selected.name}
        onComplete={handleStampComplete}
      />
    );
  }

  // 選座號（含名單為空的 Edge Case：給出路、不卡住）
  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50 px-4 py-8">
      <div className="card w-full max-w-md">
        {data.students.length === 0 ? (
          <div className="empty-state">
            <Icon name="lucide:frown" size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="px-6 text-sm text-slate-600">{messages.identity.emptyRoster}</p>
          </div>
        ) : (
          <SeatSelector students={data.students} onSelect={handleSelectSeat} />
        )}
      </div>
    </div>
  );
}
