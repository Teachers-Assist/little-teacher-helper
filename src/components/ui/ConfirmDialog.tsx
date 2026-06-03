'use client';

import { useEffect, useRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/Button';
import { messages } from '@/messages/zh-TW';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps['variant'];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Flat 風格的確認彈窗，取代瀏覽器原生 window.confirm。
 * 視覺沿用 .card；按鈕用既有 Button。
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = messages.common.confirm,
  cancelLabel = messages.common.cancel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mb-5 text-sm text-slate-600">{message}</p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} variant={confirmVariant} className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
