'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
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
        // Try to get from localStorage first (offline support)
        const offlineData = JSON.parse(localStorage.getItem('helperOfflineData') || '{}');
        
        if (offlineData.rooms?.[roomId]) {
          setRoom(offlineData.rooms[roomId]);
          setItems(offlineData.items?.[roomId] || []);
        }

        // Then try to fetch fresh data if online
        if (isOnline) {
          const [roomRes, itemsRes] = await Promise.all([
            fetch(`/api/rooms/${roomId}`),
            fetch(`/api/rooms/${roomId}/items`),
          ]);

          if (roomRes.ok) {
            const roomData = await roomRes.json();
            setRoom(roomData);
            // Update offline cache
            offlineData.rooms = offlineData.rooms || {};
            offlineData.rooms[roomId] = {
              id: roomData.id,
              name: roomData.name,
              code: roomData.code,
            };
          }

          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            setItems(itemsData);
            // Update offline cache
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">📋</div>
          <p className="text-slate-600 dark:text-slate-300">載入中...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-4 text-6xl">😕</div>
          <p className="mb-4 text-slate-600 dark:text-slate-300">找不到該房間</p>
          <Link href="/join">
            <Button variant="primary">重新加入</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link href="/join" className="mb-2 block text-sky-500 hover:text-sky-600">
          ← 離開房間
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{room.name}</h1>
        <p className="text-slate-600 dark:text-slate-300">選擇要登記的項目</p>
      </div>

      {/* Sync Status */}
      <div className="mb-4">
        <SyncIndicator />
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            尚無登記項目
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            請等待老師建立登記項目
          </p>
          {!isOnline && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              📴 目前離線，連線後會自動更新
            </p>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Link key={item.id} href={`/helper/${roomId}/${item.id}`}>
              <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{item.name}</span>
                    <span className="text-2xl">📝</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {item.dueDate ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="warning">
                        截止：{formatDate(item.dueDate)}
                      </StatusBadge>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      無截止日期
                    </p>
                  )}
                  <Button variant="ghost" size="sm" className="mt-4 w-full">
                    開始登記 →
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Network Status Toast */}
      <NetworkStatus />
    </div>
  );
}
