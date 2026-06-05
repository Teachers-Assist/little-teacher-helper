'use client';

import { useEffect, useState } from 'react';
import { generateQRCodeDataURL, generateRoomJoinURL } from '@/lib/qrcode';
import { Button } from '@/components/ui/Button';
import { messages } from '@/messages/zh-TW';

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
        setError(messages.qr.generateFailed);
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [joinUrl, size]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      alert(messages.qr.codeCopied);
    } catch {
      alert(messages.qr.copyFailed);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      alert(messages.qr.urlCopied);
    } catch {
      alert(messages.qr.copyFailed);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
        <p className="text-slate-600 dark:text-slate-300">{messages.qr.generating}</p>
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
          📋 {messages.qr.copyCode}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyUrl}>
          🔗 {messages.qr.copyUrl}
        </Button>
      </div>

      {/* Instructions */}
      <div className="mt-6 max-w-sm text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {messages.qr.instruction}
        </p>
      </div>
    </div>
  );
}

