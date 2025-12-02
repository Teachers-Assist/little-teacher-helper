'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function JoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('請輸入房間代碼');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement QR scanning and room joining
      router.push(`/join/${roomCode.toUpperCase()}`);
    } catch {
      setError('加入房間失敗，請確認代碼是否正確');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            <span className="mr-2 text-3xl">🙋</span>
            加入房間
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* QR Scanner placeholder */}
            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 p-8">
              <div className="mb-4 text-6xl">📷</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                QR 掃描功能即將推出
              </p>
            </div>

            {/* Manual code input */}
            <div>
              <label
                htmlFor="roomCode"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                或手動輸入房間代碼
              </label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="例如：ABC123"
                maxLength={6}
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-center text-2xl font-mono tracking-widest uppercase focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" variant="secondary" size="lg" className="w-full" isLoading={isLoading}>
              加入房間
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

