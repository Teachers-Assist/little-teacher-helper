'use client';

import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { messages } from '@/messages/zh-TW';

/**
 * 顯示「此次登記紀錄為：[座號]」，讓小老師知道自己的操作已被記錄（FR-012）。
 * 視覺沿用既有 badge 系統（@layer components 的 .badge-*），不自刻樣式。
 */
export function RecorderBadge({ seatNumber }: { seatNumber: number }) {
  return (
    <StatusBadge variant="warning" size="md">
      <Icon name="lucide:pen-line" size={13} />
      {messages.identity.recordedAs(seatNumber)}
    </StatusBadge>
  );
}

export default RecorderBadge;
