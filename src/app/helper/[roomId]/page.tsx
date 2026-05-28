'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NetworkStatus } from '@/components/NetworkStatus';
import { SyncIndicator } from '@/components/SyncIndicator';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { formatDate } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  code: string;
}

interface Item {
  id: string;
  name: string;
  dueDate?: string | null;
}

export default function HelperRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const offlineData = JSON.parse(localStorage.getItem('helperOfflineData') || '{}');
        if (offlineData.rooms?.[roomId]) {
          setRoom(offlineData.rooms[roomId]);
          setItems(offlineData.items?.[roomId] || []);
        }
        if (isOnline) {
          const [roomRes, itemsRes] = await Promise.all([
            fetch(`/api/rooms/${roomId}`),
            fetch(`/api/rooms/${roomId}/items`),
          ]);
          if (roomRes.ok) {
            const roomData = await roomRes.json();
            setRoom(roomData);
            offlineData.rooms = offlineData.rooms || {};
            offlineData.rooms[roomId] = { id: roomData.id, name: roomData.name, code: roomData.code };
          }
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            setItems(itemsData);
            offlineData.items = offlineData.items || {};
            offlineData.items[roomId] = itemsData;
          }
          localStorage.setItem('helperOfflineData', JSON.stringify(offlineData));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [roomId, isOnline]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7ff]">
        <div className="text-center">
          <div className="mb-3 inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary-100">
            <Icon name="lucide:clipboard-list" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7ff] p-6">
        <Icon name="lucide:frown" size={40} className="mb-3 text-slate-300" />
        <p className="mb-4 text-slate-600">找不到該房間</p>
        <Link href="/join">
          <Button variant="primary" size="sm">重新加入</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff] pb-24">
      {/* Header */}
      <div className="lp-header">
        <div className="lp-body-narrow" style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
          <Link
            href="/join"
            className="mb-1.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600"
          >
            <Icon name="lucide:arrow-left" size={13} />
            離開房間
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">{room.name}</h1>
            {!isOnline && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
                <Icon name="lucide:wifi-off" size={12} />
                離線模式
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">選擇要登記的項目</p>
        </div>
      </div>

      <div className="lp-body-narrow">
        <div className="mb-4">
          <SyncIndicator />
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cabdff] bg-white py-12 text-center">
            <Icon name="lucide:clipboard-list" size={36} className="mx-auto mb-2 text-slate-300" />
            <h2 className="mb-1 text-base font-semibold text-slate-900">尚無登記項目</h2>
            <p className="text-sm text-slate-500">請等待老師建立登記項目</p>
            {!isOnline && (
              <p className="mt-2 text-xs text-amber-500">目前離線，連線後會自動更新</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <Link key={item.id} href={`/helper/${roomId}/${item.id}`}>
                <div className="group rounded-xl border border-[#ede9fe] bg-white p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">
                      {item.name}
                    </h3>
                    <Icon name="lucide:pen-line" size={16} className="flex-shrink-0 text-slate-300 group-hover:text-primary-400 transition-colors" />
                  </div>
                  {item.dueDate ? (
                    <StatusBadge variant="warning" size="sm">
                      截止：{formatDate(item.dueDate)}
                    </StatusBadge>
                  ) : (
                    <p className="text-xs text-slate-400">無截止日期</p>
                  )}
                  <p className="mt-3 text-xs font-medium text-primary-600 group-hover:text-primary-700">
                    開始登記 →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <NetworkStatus />
      </div>
    </div>
  );
}
