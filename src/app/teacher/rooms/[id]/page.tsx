'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StudentList } from '@/components/StudentList';
import { ReportView } from '@/components/ReportView';
import { cn, formatDate } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  _count?: { students: number; items: number };
}

interface Student {
  id: string;
  name: string;
  seatNumber?: number | null;
}

interface Item {
  id: string;
  name: string;
  dueDate?: string | null;
  isActive: boolean;
}

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSeat, setNewStudentSeat] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'items' | 'report'>('students');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomRes, studentsRes, itemsRes] = await Promise.all([
          fetch(`/api/rooms/${id}`),
          fetch(`/api/rooms/${id}/students`),
          fetch(`/api/rooms/${id}/items`),
        ]);
        if (roomRes.ok) setRoom(await roomRes.json());
        if (studentsRes.ok) setStudents(await studentsRes.json());
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setItems(itemsData);
          if (itemsData.length > 0) setSelectedItemId(itemsData[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch room data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    setIsAddingStudent(true);
    try {
      const response = await fetch(`/api/rooms/${id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentName.trim(),
          seatNumber: newStudentSeat ? parseInt(newStudentSeat, 10) : undefined,
        }),
      });
      if (response.ok) {
        const student = await response.json();
        setStudents((prev) => [...prev, student]);
        setNewStudentName('');
        setNewStudentSeat('');
      }
    } catch (error) {
      console.error('Failed to add student:', error);
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setIsAddingItem(true);
    try {
      const response = await fetch(`/api/rooms/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName.trim() }),
      });
      if (response.ok) {
        const item = await response.json();
        setItems((prev) => [item, ...prev]);
        setNewItemName('');
        if (!selectedItemId) setSelectedItemId(item.id);
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsAddingItem(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-3 inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary-100">
            <Icon name="lucide:book-open" size={24} className="text-primary-600" />
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

  const tabs = [
    { id: 'students', label: '學生', icon: 'lucide:users', count: students.length },
    { id: 'items', label: '登記項目', icon: 'lucide:clipboard-list', count: items.length },
    { id: 'report', label: '報表', icon: 'lucide:bar-chart-2', count: null },
  ] as const;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <Link
          href="/teacher"
          className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600"
        >
          <Icon name="lucide:arrow-left" size={14} />
          返回儀表板
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{room.name}</h1>
            <StatusBadge variant={room.isActive ? 'success' : 'neutral'} dot size="sm">
              {room.isActive ? '啟用中' : '已停用'}
            </StatusBadge>
          </div>
          <Link href={`/teacher/rooms/${id}/qrcode`}>
            <Button variant="outline" size="sm">
              <Icon name="lucide:qr-code" size={15} />
              顯示 QRCode
            </Button>
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div className="mb-5 flex gap-1 border-b-2 border-black">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors', {
                'border-b-2 border-primary-600 text-primary-700': activeTab === tab.id,
                'text-slate-500 hover:text-slate-900':            activeTab !== tab.id,
              })}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
              {tab.count !== null && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            {/* Room Info Card */}
            <div className="rounded-xl border-2 border-black bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">房間資訊</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400">房間代碼</p>
                  <p className="font-mono text-xl font-bold tracking-widest text-slate-900">{room.code}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-slate-400">學生人數</p>
                    <p className="text-lg font-semibold text-slate-900">{students.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">登記項目</p>
                    <p className="text-lg font-semibold text-slate-900">{items.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Form */}
            {activeTab === 'students' && (
              <div className="rounded-xl border-2 border-black bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">新增學生</h3>
                <form onSubmit={handleAddStudent} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newStudentSeat}
                      onChange={(e) => setNewStudentSeat(e.target.value)}
                      placeholder="座號"
                      min="1"
                      max="99"
                      className="w-16 rounded-lg border-2 border-black bg-white px-2 py-2 text-center text-sm focus:border-primary-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="學生姓名"
                      className="flex-1 rounded-lg border-2 border-black bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                      maxLength={50}
                    />
                  </div>
                  <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isAddingStudent}>
                    新增
                  </Button>
                </form>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="rounded-xl border-2 border-black bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">新增登記項目</h3>
                <form onSubmit={handleAddItem} className="space-y-2">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="項目名稱（如：數學作業）"
                    className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    maxLength={100}
                  />
                  <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isAddingItem}>
                    新增項目
                  </Button>
                </form>
              </div>
            )}

            {activeTab === 'report' && items.length > 0 && (
              <div className="rounded-xl border-2 border-black bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">選擇項目</h3>
                <select
                  value={selectedItemId || ''}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'students' && (
              <div className="rounded-xl border-2 border-black bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">學生名單</h3>
                <StudentList students={students} isReadOnly showSubmissionStatus={false} />
              </div>
            )}

            {activeTab === 'items' && (
              <div className="rounded-xl border-2 border-black bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">登記項目列表</h3>
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
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.name}</p>
                          {item.dueDate && (
                            <p className="text-xs text-slate-400">截止：{formatDate(item.dueDate)}</p>
                          )}
                        </div>
                        <StatusBadge variant={item.isActive ? 'success' : 'neutral'} size="sm">
                          {item.isActive ? '啟用中' : '已停用'}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'report' && (
              <>
                {items.length === 0 ? (
                  <div className="rounded-xl border-2 border-black bg-white p-10 text-center">
                    <Icon name="lucide:bar-chart-2" size={36} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm text-slate-500">尚無登記項目</p>
                    <p className="mt-1 text-xs text-slate-400">建立項目後才能查看報表</p>
                  </div>
                ) : selectedItemId ? (
                  <ReportView itemId={selectedItemId} />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
