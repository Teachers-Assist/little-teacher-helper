'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

interface RoomJoinData {
  room: { id: string; name: string; code: string };
  students: Array<{ id: string; name: string; seatNumber?: number | null }>;
  items: Array<{ id: string; name: string; dueDate?: string | null }>;
}

export default function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
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
          setError(result.error || '加入房間失敗');
          return;
        }
        setData(result);
        const offlineData = JSON.parse(localStorage.getItem('helperOfflineData') || '{}');
        offlineData.rooms = offlineData.rooms || {};
        offlineData.rooms[result.room.id] = { ...result.room, joinedAt: new Date().toISOString() };
        offlineData.students = offlineData.students || {};
        offlineData.students[result.room.id] = result.students;
        offlineData.items = offlineData.items || {};
        offlineData.items[result.room.id] = result.items;
        localStorage.setItem('helperOfflineData', JSON.stringify(offlineData));
      } catch (err) {
        console.error('Failed to join room:', err);
        setError('網路錯誤，請稍後再試');
      } finally {
        setIsLoading(false);
      }
    };
    joinRoom();
  }, [code]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7ff]">
        <div className="text-center">
          <div className="mb-3 inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary-100">
            <Icon name="lucide:search" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">正在加入房間...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7ff] px-4">
        <div className="w-full max-w-sm rounded-xl border border-[#ede9fe] bg-white p-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <Icon name="lucide:alert-circle" size={24} className="text-red-500" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">無法加入房間</h2>
          <p className="mb-5 text-sm text-slate-500">{error}</p>
          <Link href="/join">
            <Button variant="primary" className="w-full">重新輸入代碼</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7ff] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#ede9fe] bg-white p-8">
        <div className="mb-5 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Icon name="lucide:check-circle-2" size={24} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">成功加入房間！</h2>
        </div>

        {/* Room name */}
        <div className="mb-4 rounded-lg bg-primary-50 p-4 text-center">
          <p className="text-xs text-primary-500">房間名稱</p>
          <p className="mt-0.5 text-lg font-bold text-primary-800">{data.room.name}</p>
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{data.students.length}</p>
            <p className="text-xs text-slate-500">位學生</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{data.items.length}</p>
            <p className="text-xs text-slate-500">個項目</p>
          </div>
        </div>

        <Button
          variant="primary"
          className="w-full"
          onClick={() => router.push(`/helper/${data.room.id}`)}
        >
          開始登記
        </Button>
      </div>
    </div>
  );
}
