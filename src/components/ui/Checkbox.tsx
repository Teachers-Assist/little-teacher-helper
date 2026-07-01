'use client';

import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Alias for size prop to avoid HTML input size conflict */
  checkboxSize?: 'sm' | 'md' | 'lg';
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, size, checkboxSize, id, ...props }, ref) => {
    const actualSize = checkboxSize ?? size ?? 'md';
    const generatedId = useId();
    const checkboxId = id || generatedId;

    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    const labelSizes = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn('checkbox', sizes[actualSize])}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'cursor-pointer font-medium text-slate-900 dark:text-white',
                  labelSizes[actualSize]
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-sm text-slate-500 dark:text-slate-400">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
