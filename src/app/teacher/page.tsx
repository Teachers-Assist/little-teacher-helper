'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

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

export default function TeacherDashboard() {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Check for existing teacher in localStorage
    const storedTeacherId = localStorage.getItem('teacherId');
    const storedTeacherName = localStorage.getItem('teacherName');

    if (storedTeacherId && storedTeacherName) {
      setTeacherId(storedTeacherId);
      setTeacherName(storedTeacherName);
      fetchRooms(storedTeacherId);
    } else {
      setShowCreateTeacher(true);
      setIsLoading(false);
    }
  }, []);

  const fetchRooms = async (id: string) => {
    try {
      const response = await fetch(`/api/rooms?teacherId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeacherName }),
      });

      if (response.ok) {
        const teacher = await response.json();
        localStorage.setItem('teacherId', teacher.id);
        localStorage.setItem('teacherName', teacher.name);
        setTeacherId(teacher.id);
        setTeacherName(teacher.name);
        setShowCreateTeacher(false);
        fetchRooms(teacher.id);
      }
    } catch (error) {
      console.error('Failed to create teacher:', error);
    } finally {
      setIsCreating(false);
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

  if (showCreateTeacher) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              <span className="mr-2 text-3xl">👨‍🏫</span>
              建立老師帳號
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <label
                  htmlFor="teacherName"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  請輸入您的名字
                </label>
                <input
                  type="text"
                  id="teacherName"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="例如：王老師"
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  maxLength={50}
                />
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isCreating}>
                開始使用
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              👋 {teacherName}，您好！
            </h1>
            <p className="text-slate-600 dark:text-slate-300">管理您的班級房間</p>
          </div>
          <Link href="/teacher/rooms/new">
            <Button variant="primary">
              <span className="mr-2">➕</span>
              建立房間
            </Button>
          </Link>
        </div>
      </div>

      {/* Room List */}
      {rooms.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">🏫</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            還沒有房間
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            建立您的第一個班級房間，開始使用小老師助手
          </p>
          <Link href="/teacher/rooms/new">
            <Button variant="primary" size="lg">
              建立第一個房間
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Link key={room.id} href={`/teacher/rooms/${room.id}`}>
              <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <StatusBadge variant={room.isActive ? 'success' : 'neutral'} dot>
                      {room.isActive ? '啟用中' : '已停用'}
                    </StatusBadge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span>👥 {room._count?.students || 0} 位學生</span>
                    <span>📋 {room._count?.items || 0} 個項目</span>
                  </div>
                  <div className="mt-3 inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1.5">
                    <span className="font-mono text-sm tracking-wider">{room.code}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="w-full">
                    查看詳情 →
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

