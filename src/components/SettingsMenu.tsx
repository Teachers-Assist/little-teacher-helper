'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

// 以外部 store 讀 localStorage 的 teacherId（SSR-safe），沿用 TeacherSidebar 讀 teacherName 的慣例。
const emptySubscribe = (): (() => void) => () => {};
const getStoredTeacherId = (): string | null => localStorage.getItem('teacherId');
const getServerTeacherId = (): string | null => null;

interface SettingsMenuProps {
  /**
   * `sidebar` — a full-width nav-item trigger for the teacher sidebar.
   * `floating` — a fixed bottom-left circular button for the helper pages,
   * which have no settings area of their own.
   */
  variant?: 'sidebar' | 'floating';
}

/**
 * Settings entry point shared by teacher and helper. Clicking the trigger opens
 * a dropdown with the language switcher. Same interface on both sides; only the
 * trigger differs per `variant`.
 */
export function SettingsMenu({ variant = 'floating' }: SettingsMenuProps) {
  const messages = useMessages();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 還原連結只在老師端（sidebar）出現，helper 端沒有 teacherId 也不該有此入口。
  const teacherId = useSyncExternalStore(emptySubscribe, getStoredTeacherId, getServerTeacherId);
  const [showRestoreWarn, setShowRestoreWarn] = useState(false);

  const copyRestoreLink = async () => {
    setShowRestoreWarn(false);
    if (!teacherId) return;
    const url = `${window.location.origin}/teacher?tid=${encodeURIComponent(teacherId)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(messages.teacher.restore.linkCopied);
    } catch {
      toast.error(messages.teacher.restore.copyFailed);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const panel = open && (
    <div
      role="menu"
      className={cn(
        'absolute z-50 w-44 rounded-xl border-2 border-black bg-white p-3 shadow-lg',
        // sidebar trigger sits at the bottom-left → open upward;
        // floating trigger sits at the top-right → open downward, right-aligned.
        variant === 'sidebar' ? 'bottom-full left-0 mb-2' : 'top-full right-0 mt-2',
      )}
    >
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {messages.nav.language}
      </p>
      <LanguageSwitcher />

      {variant === 'sidebar' && teacherId && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setShowRestoreWarn(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <Icon name="lucide:link" size={14} className="shrink-0 text-slate-400" />
            {messages.teacher.restore.copyLink}
          </button>
        </div>
      )}
    </div>
  );

  // 複製前的警告彈窗（沿用專案的 ConfirmDialog；用 modal 不用 toast，確保老師「讀完」才複製）。
  const restoreDialog = (
    <ConfirmDialog
      open={showRestoreWarn}
      title={messages.teacher.restore.warnTitle}
      message={messages.teacher.restore.warnBody}
      confirmLabel={messages.teacher.restore.warnConfirm}
      onConfirm={copyRestoreLink}
      onCancel={() => setShowRestoreWarn(false)}
    />
  );

  if (variant === 'sidebar') {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn('nav-item w-full', { 'nav-item-active': open })}
        >
          <Icon
            name="lucide:settings"
            size={17}
            className={cn(open ? 'text-black' : 'text-slate-400')}
          />
          {messages.nav.settings}
        </button>
        {panel}
        {restoreDialog}
      </div>
    );
  }

  return (
    <div ref={ref} className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={messages.nav.settings}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-white shadow-lg transition-transform hover:bg-accent-100 active:scale-95"
        >
          <Icon name="lucide:settings" size={20} className="text-slate-700" />
        </button>
        {panel}
      </div>
    </div>
  );
}

export default SettingsMenu;
