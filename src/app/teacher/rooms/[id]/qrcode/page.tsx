'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';

interface Room {
  id: string;
  name: string;
  code: string;
}

export default function QRCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${id}`);
        if (response.ok) {
          setRoom(await response.json());
        }
      } catch (error) {
        console.error('Failed to fetch room:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">📱</div>
          <p className="text-slate-600 dark:text-slate-300">載入中...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">😕</div>
          <p className="text-slate-600 dark:text-slate-300">找不到該房間</p>
          <Link href="/teacher" className="mt-4 text-sky-500 hover:text-sky-600">
            返回儀表板
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      {/* Back Link */}
      <div className="absolute left-6 top-6">
        <Link href={`/teacher/rooms/${id}`}>
          <Button variant="ghost" size="sm">
            ← 返回房間
          </Button>
        </Link>
      </div>

      {/* QR Code Card */}
      <Card className="w-full max-w-md p-8" variant="elevated">
        <QRCodeDisplay roomCode={room.code} roomName={room.name} size={280} />
      </Card>

      {/* Print Button */}
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="no-print"
        >
          🖨️ 列印 QRCode
        </Button>
      </div>
    </div>
  );
}

