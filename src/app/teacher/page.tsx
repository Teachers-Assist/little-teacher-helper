'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ClassesView } from '@/components/dashboard/ClassesView';
import { TasksView } from '@/components/dashboard/TasksView';
import type { DashboardData } from '@/components/dashboard/types';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

type View = 'classes' | 'tasks';
const VIEW_KEY = 'dashboardView';

export default function TeacherDashboard() {
  const messages = useMessages();
  const [, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    const storedTeacherId = localStorage.getItem('teacherId');
    const storedTeacherName = localStorage.getItem('teacherName');
    if (storedTeacherId && storedTeacherName) {
      setTeacherId(storedTeacherId);
      setTeacherName(storedTeacherName);
      fetchDashboard(storedTeacherId);
    } else {
      setShowCreateTeacher(true);
      setIsLoading(false);
    }
  }, []);

  const fetchDashboard = async (id: string) => {
    try {
      const res = await fetch(`/api/teachers/${id}/dashboard`);
      if (res.ok) {
        const d = (await res.json()) as DashboardData;
        setData(d);
        // 預設 tab：1 班 → 按任務；≥2 班 → 按班級（FR-052）。
        // 使用者主動切換暫存於 sessionStorage（不持久化）。
        const stored = sessionStorage.getItem(VIEW_KEY) as View | null;
        setView(stored ?? (d.stats.roomCount >= 2 ? 'classes' : 'tasks'));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchView = (v: View) => {
    setView(v);
    sessionStorage.setItem(VIEW_KEY, v);
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
        setIsLoading(true);
        fetchDashboard(teacher.id);
      }
    } catch (error) {
      console.error('Failed to create teacher:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-3 inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary-100">
            <Icon name="lucide:book-open" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">{messages.common.loading}</p>
        </div>
      </div>
    );
  }

  if (showCreateTeacher) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border-2 border-black bg-white p-8">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              <Icon name="lucide:graduation-cap" size={24} className="text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {messages.teacher.createTeacherTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{messages.teacher.createTeacherHint}</p>
          </div>
          <form onSubmit={handleCreateTeacher} className="space-y-4">
            <input
              type="text"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
              placeholder={messages.teacher.teacherNamePlaceholder}
              className="w-full rounded-lg border-2 border-black bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
              maxLength={50}
            />
            <Button type="submit" variant="primary" className="w-full" isLoading={isCreating}>
              {messages.teacher.start}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const roomCount = data?.stats.roomCount ?? 0;

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {messages.teacher.welcome(teacherName)}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{messages.teacher.manageRooms}</p>
        </div>
        <Link href="/teacher/rooms/new">
          <Button variant="primary" size="sm">
            <Icon name="lucide:plus" size={16} />
            {messages.teacher.createRoom}
          </Button>
        </Link>
      </div>

      <div className="page-body space-y-5">
        {roomCount === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cabdff] bg-white py-16 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50">
              <Icon name="lucide:school" size={28} className="text-primary-400" />
            </div>
            <h2 className="mb-1.5 text-base font-semibold text-slate-900">
              {messages.teacher.noRoomsTitle}
            </h2>
            <p className="mb-5 text-sm text-slate-500">{messages.teacher.dashboard.createFirstClass}</p>
            <Link href="/teacher/rooms/new">
              <Button variant="primary" size="sm">
                {messages.teacher.createFirstRoom}
              </Button>
            </Link>
          </div>
        ) : (
          data && (
            <>
              <DashboardStats stats={data.stats} />

              {/* 雙視角 tab */}
              <div className="flex gap-1 border-b-2 border-black">
                {([
                  { id: 'classes', label: messages.teacher.dashboard.byClass, icon: 'lucide:layout-grid' },
                  { id: 'tasks', label: messages.teacher.dashboard.byTask, icon: 'lucide:list' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => switchView(t.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                      {
                        'border-b-2 border-primary-600 text-primary-700': view === t.id,
                        'text-slate-500 hover:text-slate-900': view !== t.id,
                      }
                    )}
                  >
                    <Icon name={t.icon} size={14} />
                    {t.label}
                  </button>
                ))}
              </div>

              {view === 'classes' ? (
                <ClassesView rooms={data.rooms} />
              ) : (
                <TasksView tasks={data.tasks} />
              )}
            </>
          )
        )}
      </div>
    </>
  );
}
