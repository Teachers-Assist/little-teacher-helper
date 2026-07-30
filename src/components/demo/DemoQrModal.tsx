'use client';

// 006 示範沙盒——假 QRCode 出示畫面（US3 / T612）。
// 重用 QRCodeModal 的「滿版黑底 + 白卡 + QR」視覺語言，但：
//   - QR 編碼**無害內容**（指向 /demo 本身），不導向真實加入流程（spec AS1）
//   - QR 下方放「用新視窗模擬小老師端」按鈕 + 說明，明示這是模擬掃碼後的行為
// 不重用 QRCodeModal 元件本身——它產生指向 /join/<code> 的真 QR、且無擴充點放按鈕。

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { generateQRCodeDataURL } from '@/lib/qrcode';
import { useMessages } from '@/i18n/MessagesProvider';
import { DEMO_ROOM } from '@/lib/demo/seed';

interface DemoQrModalProps {
  open: boolean;
  onClose: () => void;
  onOpenHelper: () => void;
}

export function DemoQrModal({ open, onClose, onOpenHelper }: DemoQrModalProps) {
  const { demo, common } = useMessages();
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    // 編碼指向 /demo（無害）——掃了頂多開示範頁，不進真實班級。
    const content =
      typeof window !== 'undefined' ? `${window.location.origin}/demo` : '/demo';
    generateQRCodeDataURL(content, {
      width: 320,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={DEMO_ROOM.name}
    >
      <div
        className="relative flex w-full max-w-md flex-col items-center rounded-2xl bg-white p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={common.cancel}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        >
          <Icon name="lucide:x" size={20} />
        </button>

        <h2 className="mb-4 text-xl font-bold text-slate-900">{DEMO_ROOM.name}</h2>

        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrUrl}
            alt="QR"
            width={320}
            height={320}
            className="h-auto w-full max-w-[280px] rounded-2xl border-2 border-black bg-white object-contain p-3"
          />
        ) : (
          <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-2xl border-2 border-black">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-500" />
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-slate-500">{demo.qr.fakeHint}</p>

        <Button variant="primary" className="mt-4 w-full" onClick={onOpenHelper}>
          <Icon name="lucide:external-link" size={16} />
          {demo.qr.openHelperBtn}
        </Button>
      </div>
    </div>
  );
}
