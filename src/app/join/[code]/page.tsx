'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface RoomJoinData {
  room: {
    id: string;
    name: string;
    code: string;
  };
  students: Array<{
    id: string;
    name: string;
    seatNumber?: number | null;
  }>;
  items: Array<{
    id: string;
    name: string;
    dueDate?: string | null;
  }>;
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

        // Store room data in localStorage for offline use
        const offlineData = JSON.parse(localStorage.getItem('helperOfflineData') || '{}');
        offlineData.rooms = offlineData.rooms || {};
        offlineData.rooms[result.room.id] = {
          ...result.room,
          joinedAt: new Date().toISOString(),
        };
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

  const handleEnterRoom = () => {
    if (data) {
      router.push(`/helper/${data.room.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">🔍</div>
          <p className="text-slate-600 dark:text-slate-300">正在加入房間...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <div className="mb-4 text-6xl">😕</div>
            <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
              無法加入房間
            </h2>
            <p className="mb-6 text-slate-600 dark:text-slate-300">{error}</p>
            <Link href="/join">
              <Button variant="primary">重新輸入代碼</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 text-5xl">✅</div>
          <CardTitle>成功加入房間！</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Room Info */}
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">房間名稱</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {data.room.name}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-3">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.students.length}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">位學生</p>
            </div>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-700 p-3">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.items.length}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">個項目</p>
            </div>
          </div>

          {/* Action Button */}
          <Button variant="secondary" size="lg" className="w-full" onClick={handleEnterRoom}>
            開始登記
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

