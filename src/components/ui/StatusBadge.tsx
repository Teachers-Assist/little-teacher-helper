'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

/**
 * Badge visual styles live in @layer components (.badge-*) in globals.css.
 * To restyle badges, edit the CSS — not this file.
 */
const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant = 'neutral', size = 'md', dot = false, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'badge',
        size === 'lg' ? 'badge-lg' : size === 'md' ? 'badge-md' : '',
        `badge-${variant}`,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('rounded-full', `badge-dot-${variant}`, {
            'h-1.5 w-1.5': size === 'sm',
            'h-2 w-2':     size === 'md',
            'h-2.5 w-2.5': size === 'lg',
          })}
        />
      )}
      {children}
    </span>
  )
);

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };
