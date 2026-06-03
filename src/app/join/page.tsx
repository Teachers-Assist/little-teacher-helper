'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/QRScanner';
import { messages } from '@/messages/zh-TW';

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

  const handleJoin = async (code: string) => {
    if (!code.trim()) {
      setError(messages.qr.emptyCode);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      router.push(`/join/${code.toUpperCase()}`);
    } catch {
      setError(messages.qr.joinFailedRetry);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleJoin(roomCode);
  };

  const handleScan = (code: string) => {
    setShowScanner(false);
    handleJoin(code);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
            <Icon name="lucide:book-open" size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{messages.qr.enterTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{messages.qr.enterHint}</p>
        </div>

        <div className="rounded-xl border-2 border-black bg-white p-6 space-y-5">
          {/* QR Scanner */}
          {showScanner ? (
            <div>
              <QRScanner onScan={handleScan} onError={(err) => setError(err)} />
              <Button variant="outline" className="mt-3 w-full" size="sm" onClick={() => setShowScanner(false)}>
                {messages.qr.cancelScan}
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowScanner(true)}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-black bg-accent-100 py-7 text-center transition-colors hover:border-primary-400 hover:bg-primary-100"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                <Icon name="lucide:camera" size={24} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-700">{messages.qr.scanTitle}</p>
                <p className="text-xs text-primary-500">{messages.qr.tapToOpenCamera}</p>
              </div>
            </button>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">{messages.qr.orManual}</span>
            </div>
          </div>

          {/* Manual Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="roomCode" className="mb-1.5 block text-xs font-medium text-slate-500">
                {messages.qr.roomCode}
              </label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder={messages.qr.codePlaceholder}
                maxLength={6}
                className="w-full rounded-lg border-2 border-black bg-white px-4 py-3 text-center text-xl font-mono tracking-widest uppercase focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              {messages.join.joinButton}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
