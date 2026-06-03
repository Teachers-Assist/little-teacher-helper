'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { messages } from '@/messages/zh-TW';

interface Room {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  _count?: {
    students: number;
    tasks: number;
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
      if (response.ok) setRooms(await response.json());
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
            <h2 className="text-xl font-bold text-slate-900">{messages.teacher.createTeacherTitle}</h2>
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

  return (
    <>
      {/* Page Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{messages.teacher.welcome(teacherName)}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{messages.teacher.manageRooms}</p>
        </div>
        <Link href="/teacher/rooms/new">
          <Button variant="primary" size="sm">
            <Icon name="lucide:plus" size={16} />
            {messages.teacher.createRoom}
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="page-body">
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cabdff] bg-white py-16 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50">
              <Icon name="lucide:school" size={28} className="text-primary-400" />
            </div>
            <h2 className="mb-1.5 text-base font-semibold text-slate-900">{messages.teacher.noRoomsTitle}</h2>
            <p className="mb-5 text-sm text-slate-500">{messages.teacher.noRoomsDesc}</p>
            <Link href="/teacher/rooms/new">
              <Button variant="primary" size="sm">{messages.teacher.createFirstRoom}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Link key={room.id} href={`/teacher/rooms/${room.id}`}>
                <div className="group rounded-xl border-2 border-black bg-white p-5 transition-colors hover:bg-accent-100 cursor-pointer">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">
                      {room.name}
                    </h3>
                    <StatusBadge variant={room.isActive ? 'success' : 'neutral'} dot size="sm">
                      {room.isActive ? messages.teacher.active : messages.teacher.inactive}
                    </StatusBadge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Icon name="lucide:users" size={13} />
                      {messages.teacher.studentsUnit(room._count?.students || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="lucide:clipboard-list" size={13} />
                      {messages.teacher.tasksUnit(room._count?.tasks || 0)}
                    </span>
                  </div>
                  <div className="mt-3 inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1">
                    <span className="font-mono text-xs font-medium tracking-widest text-slate-600">
                      {room.code}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
