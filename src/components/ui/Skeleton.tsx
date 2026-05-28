'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-slate-200 dark:bg-slate-700',
        variants[variant],
        animations[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

// Card Skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-md', className)}>
      <div className="flex items-start justify-between mb-4">
        <Skeleton width={150} height={24} />
        <Skeleton width={60} height={24} variant="text" />
      </div>
      <div className="space-y-2">
        <Skeleton height={16} className="w-full" />
        <Skeleton height={16} className="w-3/4" />
      </div>
    </div>
  );
}

// Room Card Skeleton
export function RoomCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-md">
      <div className="mb-3">
        <Skeleton width={120} height={24} className="mb-2" />
        <Skeleton width={80} height={20} />
      </div>
      <div className="flex items-center gap-4 mb-3">
        <Skeleton width={80} height={16} />
        <Skeleton width={80} height={16} />
      </div>
      <Skeleton height={32} className="w-full mt-4" variant="text" />
    </div>
  );
}

// Student List Skeleton
export function StudentListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4"
        >
          <Skeleton width={24} height={24} variant="rectangular" />
          <div className="flex-1">
            <Skeleton width={100} height={20} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <Skeleton width={150} height={20} className="mb-2" />
        <Skeleton width={250} height={32} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CardSkeleton />
        </div>
        <div className="lg:col-span-2">
          <CardSkeleton className="mb-4" />
          <StudentListSkeleton />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;

