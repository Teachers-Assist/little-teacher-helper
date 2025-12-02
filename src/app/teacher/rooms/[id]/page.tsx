'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StudentList } from '@/components/StudentList';
import { ReportView } from '@/components/ReportView';
import { formatDate } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  _count?: {
    students: number;
    items: number;
  };
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

        if (roomRes.ok) {
          setRoom(await roomRes.json());
        }
        if (studentsRes.ok) {
          setStudents(await studentsRes.json());
        }
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setItems(itemsData);
          if (itemsData.length > 0) {
            setSelectedItemId(itemsData[0].id);
          }
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
        body: JSON.stringify({
          name: newItemName.trim(),
        }),
      });

      if (response.ok) {
        const item = await response.json();
        setItems((prev) => [item, ...prev]);
        setNewItemName('');
        if (!selectedItemId) {
          setSelectedItemId(item.id);
        }
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsAddingItem(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">📚</div>
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/teacher" className="mb-2 block text-sky-500 hover:text-sky-600">
            ← 返回儀表板
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{room.name}</h1>
            <StatusBadge variant={room.isActive ? 'success' : 'neutral'} dot>
              {room.isActive ? '啟用中' : '已停用'}
            </StatusBadge>
          </div>
        </div>
        <Link href={`/teacher/rooms/${id}/qrcode`}>
          <Button variant="primary">
            <span className="mr-2">📱</span>
            顯示 QRCode
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'students'
              ? 'border-b-2 border-sky-500 text-sky-600'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          👥 學生 ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'items'
              ? 'border-b-2 border-sky-500 text-sky-600'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          📋 登記項目 ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'report'
              ? 'border-b-2 border-sky-500 text-sky-600'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          📊 報表
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>房間資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">房間代碼</p>
                <p className="font-mono text-2xl font-bold tracking-widest">{room.code}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">學生人數</p>
                <p className="text-xl font-semibold">{students.length} 人</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">登記項目</p>
                <p className="text-xl font-semibold">{items.length} 個</p>
              </div>
            </CardContent>
          </Card>

          {/* Add Form based on tab */}
          {activeTab === 'students' && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>新增學生</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddStudent} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newStudentSeat}
                      onChange={(e) => setNewStudentSeat(e.target.value)}
                      placeholder="座號"
                      min="1"
                      max="99"
                      className="w-20 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-center focus:border-sky-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="學生姓名"
                      className="flex-1 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:border-sky-500 focus:outline-none"
                      maxLength={50}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    isLoading={isAddingStudent}
                  >
                    新增
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'items' && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>新增登記項目</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddItem} className="space-y-3">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="項目名稱（如：數學作業）"
                    className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:border-sky-500 focus:outline-none"
                    maxLength={100}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    isLoading={isAddingItem}
                  >
                    新增項目
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'report' && items.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>選擇項目</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedItemId || ''}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 focus:border-sky-500 focus:outline-none"
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {activeTab === 'students' && (
            <Card>
              <CardHeader>
                <CardTitle>學生名單</CardTitle>
              </CardHeader>
              <CardContent>
                <StudentList students={students} isReadOnly showSubmissionStatus={false} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'items' && (
            <Card>
              <CardHeader>
                <CardTitle>登記項目列表</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mb-2 text-4xl">📋</div>
                    <p className="text-slate-600 dark:text-slate-300">尚無登記項目</p>
                    <p className="text-sm text-slate-500">建立項目後，小老師就可以開始登記繳交狀況</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                          {item.dueDate && (
                            <p className="text-sm text-slate-500">
                              截止：{formatDate(item.dueDate)}
                            </p>
                          )}
                        </div>
                        <StatusBadge variant={item.isActive ? 'success' : 'neutral'}>
                          {item.isActive ? '啟用中' : '已停用'}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'report' && (
            <>
              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <div className="mb-2 text-4xl">📊</div>
                    <p className="text-slate-600 dark:text-slate-300">尚無登記項目</p>
                    <p className="text-sm text-slate-500">建立項目後才能查看報表</p>
                  </CardContent>
                </Card>
              ) : selectedItemId ? (
                <ReportView itemId={selectedItemId} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
