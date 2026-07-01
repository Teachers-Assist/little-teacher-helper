'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  /** lucide 圖示名稱（選填） */
  icon?: string;
  onClick: () => void;
  /** 危險操作（紅色樣式） */
  danger?: boolean;
}

export interface MenuProps {
  /** 觸發鈕的無障礙標籤 */
  label: string;
  items: MenuItem[];
}

/**
 * 「⋮」溢位選單：把低頻操作收進下拉，維持列表卡片右緣對齊。
 * 面板以 portal 渲染到 body + fixed 定位，避免被 overflow 捲動容器裁切。
 */
export function Menu({ label, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // 捲動 / 縮放時關閉，避免面板與觸發鈕錯位
    const onReflow = () => setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Icon name="lucide:ellipsis-vertical" size={18} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div ref={panelRef} role="menu" className="menu-panel" style={{ top: pos.top, right: pos.right }}>
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn('menu-item', item.danger && 'menu-item-danger')}
              >
                {item.icon && <Icon name={item.icon} size={15} />}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
