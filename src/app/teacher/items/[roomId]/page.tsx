'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ItemList } from '@/components/ItemList';
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
  isActive: boolean;
}

export default function ItemManagementPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomRes, itemsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}`),
          fetch(`/api/rooms/${roomId}/items?activeOnly=false`),
        ]);

        if (roomRes.ok) {
          setRoom(await roomRes.json());
        }
        if (itemsRes.ok) {
          setItems(await itemsRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsAddingItem(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName.trim(),
          dueDate: newItemDueDate || undefined,
        }),
      });

      if (response.ok) {
        const item = await response.json();
        setItems((prev) => [item, ...prev]);
        setNewItemName('');
        setNewItemDueDate('');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleEditItem = async (itemId: string) => {
    if (!editName.trim()) return;

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? updatedItem : item))
        );
        setEditingItemId(null);
        setEditName('');
      }
    } catch (error) {
      console.error('Failed to edit item:', error);
    }
  };

  const handleToggleActive = async (itemId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? updatedItem : item))
        );
      }
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">😕</div>
          <p className="text-slate-600 dark:text-slate-300">找不到該房間</p>
          <Link href="/teacher" className="mt-4 text-sky-500 hover:text-sky-600">
            返回儀表板
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/teacher/rooms/${roomId}`}
          className="mb-2 block text-sky-500 hover:text-sky-600"
        >
          ← 返回 {room.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          📋 登記項目管理
        </h1>
        <p className="text-slate-600 dark:text-slate-300">{room.name}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Add Item Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>新增登記項目</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label
                    htmlFor="itemName"
                    className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    項目名稱
                  </label>
                  <input
                    type="text"
                    id="itemName"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="例如：數學作業"
                    className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:border-sky-500 focus:outline-none"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label
                    htmlFor="dueDate"
                    className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    截止日期（選填）
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={newItemDueDate}
                    onChange={(e) => setNewItemDueDate(e.target.value)}
                    className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isAddingItem}
                >
                  新增項目
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Item List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>項目列表 ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-2 text-4xl">📋</div>
                  <p className="text-slate-600 dark:text-slate-300">
                    尚無登記項目
                  </p>
                  <p className="text-sm text-slate-500">
                    建立項目後，小老師就可以開始登記繳交狀況
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                    >
                      <div className="flex-1 min-w-0">
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleEditItem(item.id)}
                            >
                              儲存
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingItemId(null);
                                setEditName('');
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {item.name}
                            </p>
                            {item.dueDate && (
                              <p className="text-sm text-slate-500">
                                截止：{formatDate(item.dueDate)}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      {editingItemId !== item.id && (
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant={item.isActive ? 'secondary' : 'outline'}
                            onClick={() => handleToggleActive(item.id, item.isActive)}
                          >
                            {item.isActive ? '啟用中' : '已停用'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditName(item.name);
                            }}
                          >
                            ✏️
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

