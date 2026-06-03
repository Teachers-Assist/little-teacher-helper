'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Button } from '@/components/ui/Button';
import { parseRoomCodeFromURL } from '@/lib/qrcode';
import { messages } from '@/messages/zh-TW';

interface QRScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanning = () => {
    if (!containerRef.current) return;

    setIsScanning(true);
    setError(null);

    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        // Try to parse room code from URL
        const roomCode = parseRoomCodeFromURL(decodedText);
        if (roomCode) {
          stopScanning();
          onScan(roomCode);
        } else if (/^[A-Z0-9]{6}$/i.test(decodedText)) {
          // Direct room code
          stopScanning();
          onScan(decodedText.toUpperCase());
        } else {
          setError(messages.qr.invalid);
        }
      },
      (errorMessage) => {
        // Ignore common scan errors
        if (!errorMessage.includes('No QR code found')) {
          console.warn('QR Scanner error:', errorMessage);
        }
      }
    );
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const handleError = (err: string) => {
    setError(err);
    onError?.(err);
  };

  return (
    <div className="flex flex-col items-center">
      {!isScanning ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 p-8 w-full">
          <div className="mb-4 text-6xl">📷</div>
          <p className="mb-4 text-center text-slate-600 dark:text-slate-300">
            {messages.qr.scanInstruction}
          </p>
          <Button variant="primary" onClick={startScanning}>
            {messages.qr.startScan}
          </Button>
        </div>
      ) : (
        <div className="w-full">
          <div
            id="qr-reader"
            ref={containerRef}
            className="rounded-xl overflow-hidden"
          />
          <Button
            variant="outline"
            onClick={stopScanning}
            className="mt-4 w-full"
          >
            {messages.qr.stopScan}
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 w-full text-center">
          {error}
        </div>
      )}
    </div>
  );
}

export default QRScanner;

