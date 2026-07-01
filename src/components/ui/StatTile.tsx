'use client';

import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface StatTileProps {
  /** 統計項目名稱 */
  label: string;
  /** 數值 */
  value: ReactNode;
  /** lucide 圖示名稱，例如 "lucide:school" */
  icon: string;
  /** 數值文字顏色 class，預設深灰 */
  tone?: string;
}

/**
 * 統計小卡：大數字 + 圖示標籤，水平排列以節省垂直空間。
 * 供 Dashboard / 班級狀況等跨班級統計列共用（視覺由 .stat-tile 語意 class 定義）。
 */
export function StatTile({ label, value, icon, tone = 'text-slate-900' }: StatTileProps) {
  return (
    <div className="stat-tile">
      <p className={`stat-tile-value ${tone}`}>{value}</p>
      <span className="stat-tile-label">
        <Icon name={icon} size={13} />
        {label}
      </span>
    </div>
  );
}
