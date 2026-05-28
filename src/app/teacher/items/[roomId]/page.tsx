'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
        if (roomRes.ok) setRoom(await roomRes.json());
        if (itemsRes.ok) setItems(await itemsRes.json());
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
        body: JSON.stringify({ name: newItemName.trim(), dueDate: newItemDueDate || undefined }),
      });
      if (response.ok) {
        setItems((prev) => [await response.json(), ...prev]);
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
        setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, name: editName.trim() } : item)));
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
        const updated = await response.json();
        setItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
      }
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
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
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Icon name="lucide:frown" size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="mb-3 text-slate-600">找不到該房間</p>
          <Link href="/teacher" className="text-sm text-primary-600 hover:text-primary-700">
            返回儀表板
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <Link
          href={`/teacher/rooms/${roomId}`}
          className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600"
        >
          <Icon name="lucide:arrow-left" size={14} />
          返回 {room.name}
        </Link>
        <h1 className="text-xl font-bold text-slate-900">登記項目管理</h1>
      </div>

      <div className="page-body">
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-[#ede9fe] bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">新增登記項目</h3>
              <form onSubmit={handleAddItem} className="space-y-3">
                <div>
                  <label htmlFor="itemName" className="mb-1 block text-xs font-medium text-slate-500">
                    項目名稱
                  </label>
                  <input
                    type="text"
                    id="itemName"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="例如：數學作業"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="dueDate" className="mb-1 block text-xs font-medium text-slate-500">
                    截止日期（選填）
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={newItemDueDate}
                    onChange={(e) => setNewItemDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isAddingItem}>
                  新增項目
                </Button>
              </form>
            </div>
          </div>

          {/* Item List */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-[#ede9fe] bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                項目列表
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                  {items.length}
                </span>
              </h3>
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <Icon name="lucide:clipboard-list" size={36} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-500">尚無登記項目</p>
                  <p className="mt-1 text-xs text-slate-400">建立項目後，小老師就可以開始登記繳交狀況</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                              autoFocus
                            />
                            <Button size="sm" variant="primary" onClick={() => handleEditItem(item.id)}>
                              儲存
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingItemId(null); setEditName(''); }}
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-900">{item.name}</p>
                            {item.dueDate && (
                              <p className="text-xs text-slate-400">截止：{formatDate(item.dueDate)}</p>
                            )}
                          </>
                        )}
                      </div>
                      {editingItemId !== item.id && (
                        <div className="ml-4 flex items-center gap-2">
                          <StatusBadge
                            variant={item.isActive ? 'success' : 'neutral'}
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(item.id, item.isActive)}
                          >
                            {item.isActive ? '啟用中' : '已停用'}
                          </StatusBadge>
                          <button
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                            onClick={() => { setEditingItemId(item.id); setEditName(item.name); }}
                          >
                            <Icon name="lucide:pencil" size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
