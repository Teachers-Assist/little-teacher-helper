'use client';

import { useEffect, useState } from 'react';
import { generateQRCodeDataURL, generateRoomJoinURL } from '@/lib/qrcode';
import { Button } from '@/components/ui/Button';

interface QRCodeDisplayProps {
  roomCode: string;
  roomName?: string;
  size?: number;
}

export function QRCodeDisplay({ roomCode, roomName, size = 256 }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const joinUrl = generateRoomJoinURL(roomCode);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        const dataUrl = await generateQRCodeDataURL(joinUrl, {
          width: size,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrCodeUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setError('無法產生 QRCode');
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [joinUrl, size]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      alert('代碼已複製到剪貼簿！');
    } catch {
      alert('複製失敗，請手動複製');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      alert('連結已複製到剪貼簿！');
    } catch {
      alert('複製失敗，請手動複製');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
        <p className="text-slate-600 dark:text-slate-300">產生 QRCode 中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 p-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* QR Code Image */}
      <div className="rounded-2xl bg-white p-4 shadow-lg">
        {qrCodeUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCodeUrl}
            alt={`QR Code for room ${roomCode}`}
            width={size}
            height={size}
            className="rounded-lg"
          />
        )}
      </div>

      {/* Room Info */}
      <div className="mt-6 text-center">
        {roomName && (
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            {roomName}
          </h3>
        )}
        <div className="mb-4 inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-700 px-6 py-3">
          <span className="font-mono text-3xl font-bold tracking-widest text-slate-900 dark:text-white">
            {roomCode}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button variant="outline" size="sm" onClick={handleCopyCode}>
          📋 複製代碼
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyUrl}>
          🔗 複製連結
        </Button>
      </div>

      {/* Instructions */}
      <div className="mt-6 max-w-sm text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          讓小老師用手機掃描此 QRCode，或輸入上方代碼即可加入房間
        </p>
      </div>
    </div>
  );
}

