'use client';

import { useEffect, useState, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { generateQRCodeDataURL, generateRoomJoinURL } from '@/lib/qrcode';
import { useMessages } from '@/i18n/MessagesProvider';

interface QRCodeModalProps {
  roomCode: string;
  roomName: string;
  open: boolean;
  onClose: () => void;
}

/**
 * QRCode 分享 modal（002 US7 / FR-045~049）。滿版黑底 + 中央白卡，
 * 班級名（大字）→ QRCode（~480px）→ 6 字短碼（與 QRCode 視覺重量相當）。
 * 操作：進入全螢幕、複製代碼、複製連結（toast 回饋，不用 alert）。
 */
export function QRCodeModal({ roomCode, roomName, open, onClose }: QRCodeModalProps) {
  const messages = useMessages();
  const toast = useToast();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const joinUrl = generateRoomJoinURL(roomCode);

  useEffect(() => {
    if (!open) return;
    let active = true;
    generateQRCodeDataURL(joinUrl, {
      width: 480,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch((err) => console.error('Failed to generate QR code:', err));
    return () => {
      active = false;
    };
  }, [open, joinUrl]);

  // ESC：先離開全螢幕，再次按下才關 modal（FR-049 / AS7）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleCopy = useCallback(
    async (value: string, successMsg: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(successMsg);
      } catch {
        toast.error(messages.teacher.qrcode.copyFailed);
      }
    },
    [toast, messages]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={roomName}
    >
      <div
        className="flex max-h-full w-full max-w-xl flex-col items-center rounded-2xl bg-white p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={messages.common.cancel}
          className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/20"
        >
          <Icon name="lucide:x" size={22} />
        </button>

        <h2 className="mb-4 shrink-0 text-2xl font-bold text-slate-900">{roomName}</h2>

        {/* QR：等比方形，依「可用寬度」與「視窗剩餘高度」雙重夾住縮放，
            確保整體（含下方按鈕）不需捲動；不依賴 flex 高度解析。 */}
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrUrl}
            alt={`QR Code ${roomCode}`}
            width={480}
            height={480}
            className="h-auto w-auto max-h-[min(480px,calc(100dvh-280px))] max-w-[min(480px,100%)] rounded-2xl border-2 border-black bg-white object-contain p-3"
          />
        ) : (
          <div className="flex aspect-square w-full max-w-[480px] items-center justify-center rounded-2xl border-2 border-black bg-white">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary-500" />
          </div>
        )}

        <div className="mt-4 inline-flex shrink-0 items-center rounded-xl bg-slate-100 px-6 py-3">
          <span className="font-mono text-3xl font-bold tracking-[0.3em] text-slate-900">
            {roomCode}
          </span>
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap justify-center gap-2">
          <Button variant="primary" size="sm" onClick={handleFullscreen}>
            <Icon name="lucide:maximize" size={15} />
            {messages.teacher.qrcode.fullscreen}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(roomCode, messages.qr.codeCopied)}
          >
            <Icon name="lucide:copy" size={15} />
            {messages.qr.copyCode}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(joinUrl, messages.qr.urlCopied)}
          >
            <Icon name="lucide:link" size={15} />
            {messages.qr.copyUrl}
          </Button>
        </div>
      </div>
    </div>
  );
}
