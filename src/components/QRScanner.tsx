'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseRoomCodeFromURL } from '@/lib/qrcode';
import { useMessages } from '@/i18n/MessagesProvider';

interface QRScannerProps {
  /** 掃到有效房間碼時觸發 */
  onScan: (code: string) => void;
  /** 掃到非本系統 QRCode（解析不出房間碼）時觸發，帶兒童語氣訊息 */
  onError?: (error: string) => void;
  /** 相機權限被拒（FR-062）→ 由 /join 退回開始狀態並聚焦輸入框 */
  onPermissionDenied?: () => void;
  /** 沒有可用相機 / 瀏覽器不支援 getUserMedia（FR-063）→ 由 /join 隱藏相機區並聚焦輸入框 */
  onUnsupported?: () => void;
}

const READER_ID = 'qr-reader';

/**
 * 相機 QRCode 掃描（003 US1）。
 *
 * 由 `/join` 在使用者按「開始掃描」後才掛載，掛載即自動啟動相機 —— 元件本身
 * **不提供「停止 / 取消掃描」按鈕**（FR-061）；要切到手動輸入由 /join 往下捲動完成。
 *
 * 採 html5-qrcode 的核心 `Html5Qrcode`（非帶 UI 的 `Html5QrcodeScanner`），
 * 以便程式化偵測相機權限被拒 / 無相機，並把出路交回 /join 處理。
 */
export function QRScanner({ onScan, onError, onPermissionDenied, onUnsupported }: QRScannerProps) {
  const messages = useMessages();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // StrictMode 會掛載兩次；用 ref 確保只啟動一次相機
  const startedRef = useRef(false);

  useEffect(() => {
    // 瀏覽器不支援取得相機串流 → 直接交回 /join 隱藏相機區
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onUnsupported?.();
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    const handleDecoded = (decodedText: string) => {
      const roomCode = parseRoomCodeFromURL(decodedText);
      const code = roomCode ?? (/^[A-Z0-9]{6}$/i.test(decodedText) ? decodedText.toUpperCase() : null);
      if (!code) {
        // 掃到的不是老師給的房間碼 / URL（FR-064、AS8）
        onError?.(messages.qr.codeNotOurs);
        return;
      }
      stop().finally(() => onScan(code));
    };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleDecoded,
        // 逐幀掃描的雜訊錯誤（找不到碼）忽略
        () => {}
      )
      .catch((err: unknown) => {
        startedRef.current = false;
        const name = (err as { name?: string })?.name ?? '';
        const text = `${name} ${String(err)}`;
        if (/NotAllowed|Permission|denied/i.test(text)) {
          onPermissionDenied?.();
        } else if (/NotFound|NotReadable|Overconstrained|no camera/i.test(text)) {
          // 沒有可用相機，等同不支援的出路
          onUnsupported?.();
        } else {
          onPermissionDenied?.();
        }
      });

    async function stop() {
      const s = scannerRef.current;
      if (!s) return;
      scannerRef.current = null;
      try {
        await s.stop();
        s.clear();
      } catch {
        // 已停止 / 尚未啟動，忽略
      }
    }

    return () => {
      void stop();
    };
    // 僅在掛載時啟動一次；messages 為穩定參照
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={READER_ID} className="overflow-hidden rounded-xl border-2 border-black" />;
}

export default QRScanner;
