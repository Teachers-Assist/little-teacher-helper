'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { useMessages } from '@/i18n/MessagesProvider';

interface Room {
  id: string;
  name: string;
  code: string;
}

export default function QRCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const messages = useMessages();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${id}`);
        if (response.ok) setRoom(await response.json());
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
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-3 inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary-100">
            <Icon name="lucide:qr-code" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">{messages.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Icon name="lucide:frown" size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="mb-3 text-slate-600">{messages.room.notFoundTitle}</p>
          <Link href="/teacher" className="text-sm text-primary-600 hover:text-primary-700">
            {messages.teacher.backToDashboard}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <Link
          href={`/teacher/rooms/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600"
        >
          <Icon name="lucide:arrow-left" size={14} />
          {messages.qr.backToRoom}
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{messages.qr.pageTitle(room.name)}</h1>
      </div>

      <div className="page-body">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-sm rounded-xl border-2 border-black bg-white p-6 text-center">
            <QRCodeDisplay roomCode={room.code} roomName={room.name} size={260} />
          </div>
          <div className="mt-4 no-print">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Icon name="lucide:printer" size={15} />
              {messages.qr.printQrcode}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
