'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/QRScanner';
import { useMessages } from '@/i18n/MessagesProvider';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useFailureCounter } from '@/hooks/useFailureCounter';

export default function JoinPage() {
  const messages = useMessages();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const failure = useFailureCounter(3);

  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [cameraHidden, setCameraHidden] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 進入頁面即偵測是否支援取得相機串流；不支援則隱藏相機區並聚焦輸入框（FR-063 / AS4）
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      setCameraHidden(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, []);

  const focusInput = () => {
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const attemptJoin = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) {
      setError(messages.qr.emptyCode);
      return;
    }
    if (!isOnline) {
      setError(messages.qr.noNetwork);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // 先驗證房間碼存在，才導頁；失敗計數用於連續錯誤升級訊息（FR-065）
      const res = await fetch(`/api/rooms/join/${code}`);
      if (!res.ok) {
        const nextCount = failure.count + 1;
        failure.increment();
        setError(nextCount >= 3 ? messages.qr.failureUpgrade : messages.join.roomNotFound);
        return;
      }
      failure.reset();
      router.push(`/join/${code}`);
    } catch {
      setError(messages.common.networkError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptJoin(roomCode);
  };

  const handleScan = (code: string) => {
    setShowScanner(false);
    attemptJoin(code);
  };

  const handlePermissionDenied = () => {
    // 相機權限被拒：退回開始狀態 + 提示 + 自動聚焦輸入框（FR-062 / AS3）
    setShowScanner(false);
    setError(messages.qr.permissionDenied);
    focusInput();
  };

  const handleUnsupported = () => {
    // 沒有可用相機：隱藏相機區 + 聚焦輸入框（FR-063 / AS4）
    setShowScanner(false);
    setCameraHidden(true);
    setError(messages.qr.cameraUnsupported);
    focusInput();
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

        <div className="space-y-5 rounded-xl border-2 border-black bg-white p-6">
          {/* 離線提示（AS7）：沒有網路時，掃描與送出都先停下 */}
          {!isOnline && (
            <div className="flex items-center gap-2 rounded-lg border-2 border-black bg-accent-100 p-3 text-sm font-medium text-slate-900">
              <Icon name="lucide:wifi-off" size={16} />
              {messages.qr.noNetwork}
            </div>
          )}

          {/* 相機掃描區（FR-060：預設單一「開始掃描」狀態，無中介虛線框、無取消鈕） */}
          {!cameraHidden && (
            <div>
              {showScanner ? (
                <QRScanner
                  onScan={handleScan}
                  onError={(err) => setError(err)}
                  onPermissionDenied={handlePermissionDenied}
                  onUnsupported={handleUnsupported}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-black bg-accent-100">
                    <Icon name="lucide:camera" size={28} className="text-primary-600" />
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setError('');
                      setShowScanner(true);
                    }}
                    disabled={!isOnline}
                  >
                    {messages.qr.startScan}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {!cameraHidden && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400">{messages.qr.orManual}</span>
              </div>
            </div>
          )}

          {/* 手動輸入 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="roomCode" className="mb-1.5 block text-xs font-medium text-slate-500">
                {messages.qr.roomCode}
              </label>
              <input
                ref={inputRef}
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder={messages.qr.codePlaceholder}
                maxLength={6}
                className="w-full rounded-lg border-2 border-black bg-white px-4 py-3 text-center text-xl font-mono tracking-widest uppercase focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
              />
            </div>

            {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</div>}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              disabled={!isOnline}
            >
              {messages.join.joinButton}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
