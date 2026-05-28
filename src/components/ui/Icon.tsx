'use client';

import '@/lib/icons-setup';
import { Icon as IconifyIcon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface IconProps {
  /** Icon identifier, e.g. "lucide:layout-dashboard" */
  name: string;
  /** Pixel size (width = height). Defaults to 18. */
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <IconifyIcon
      icon={name}
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    />
  );
}
