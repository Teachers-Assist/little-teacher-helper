'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  dueDate?: string | Date | null;
  isActive: boolean;
  createdAt?: string | Date;
}

interface ItemStats {
  submittedCount?: number;
  notSubmittedCount?: number;
  totalCount?: number;
}

interface ItemListProps {
  items: (Item & Partial<ItemStats>)[];
  onItemClick?: (itemId: string) => void;
  onItemEdit?: (itemId: string) => void;
  onItemDelete?: (itemId: string) => void;
  showStats?: boolean;
  emptyMessage?: string;
}

export function ItemList({
  items,
  onItemClick,
  onItemEdit,
  onItemDelete,
  showStats = false,
  emptyMessage = '尚無登記項目',
}: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 p-8">
        <div className="mb-2 text-4xl">📋</div>
        <p className="text-slate-600 dark:text-slate-300">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const submissionRate =
          item.totalCount && item.totalCount > 0
            ? Math.round(((item.submittedCount || 0) / item.totalCount) * 100)
            : 0;

        return (
          <Card
            key={item.id}
            className={`transition-all ${onItemClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
            onClick={() => onItemClick?.(item.id)}
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    <StatusBadge
                      variant={item.isActive ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {item.isActive ? '啟用中' : '已停用'}
                    </StatusBadge>
                  </div>

                  {item.dueDate && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      截止日期：{formatDate(item.dueDate)}
                    </p>
                  )}

                  {showStats && item.totalCount !== undefined && (
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${submissionRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {submissionRate}%
                        </span>
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {item.submittedCount || 0}/{item.totalCount} 已繳
                      </span>
                    </div>
                  )}
                </div>

                {(onItemEdit || onItemDelete) && (
                  <div className="flex items-center gap-2">
                    {onItemEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemEdit(item.id);
                        }}
                      >
                        ✏️
                      </Button>
                    )}
                    {onItemDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemDelete(item.id);
                        }}
                      >
                        🗑️
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default ItemList;

