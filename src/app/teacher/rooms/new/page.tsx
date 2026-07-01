'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { StudentImport } from '@/components/StudentImport';
import { useMessages } from '@/i18n/MessagesProvider';

export default function NewRoomPage() {
  const messages = useMessages();
  const [roomName, setRoomName] = useState('');
  const [studentNames, setStudentNames] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedTeacherId = localStorage.getItem('teacherId');
    if (!storedTeacherId) {
      router.push('/teacher');
      return;
    }
    setTeacherId(storedTeacherId);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !teacherId) {
      setError(messages.teacher.emptyClassName);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const roomResponse = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName.trim(), teacherId }),
      });
      if (!roomResponse.ok) throw new Error('room create failed');
      const room = await roomResponse.json();

      if (studentNames.trim()) {
        const students = studentNames
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => {
            const match = line.match(/^(\d{1,2})\s+(.+)$/);
            if (match) return { seatNumber: parseInt(match[1], 10), name: match[2].trim() };
            return { name: line };
          });
        if (students.length > 0) {
          await fetch(`/api/rooms/${room.id}/students/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students }),
          });
        }
      }
      router.push(`/teacher/rooms/${room.id}`);
    } catch (err) {
      console.error('Failed to create room:', err);
      setError(messages.teacher.createRoomFailed);
    } finally {
      setIsLoading(false);
    }
  };

  if (!teacherId) return null;

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="text-xl font-bold text-slate-900">{messages.teacher.newRoomTitle}</h1>
      </div>

      <div className="page-body">
        <div className="mx-auto max-w-lg rounded-xl border-2 border-black bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Room Name */}
            <div>
              <label htmlFor="roomName" className="mb-1.5 block text-sm font-medium text-slate-700">
                {messages.teacher.className} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={messages.teacher.classNamePlaceholder}
                className="w-full rounded-lg border-2 border-black bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                maxLength={100}
              />
            </div>

            {/* Student Names */}
            <div>
              <label
                htmlFor="studentNames"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {messages.teacher.rosterOptional}
              </label>
              <p className="mb-2 text-xs text-slate-400">
                {messages.teacher.rosterHint}
                <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">
                  {messages.teacher.rosterExample}
                </code>
              </p>
              <textarea
                id="studentNames"
                value={studentNames}
                onChange={(e) => setStudentNames(e.target.value)}
                placeholder={messages.teacher.rosterPlaceholder}
                rows={8}
                className="w-full rounded-lg border-2 border-black bg-white px-4 py-2.5 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
              />
              {/* US1：Excel 範本下載 + 解析填入上方名單（收集模式，建班時一起送出） */}
              <div className="mt-3">
                <StudentImport
                  onParsed={(parsed) =>
                    setStudentNames((prev) => {
                      const lines = parsed.map((s) => `${s.seatNumber} ${s.name}`).join('\n');
                      return prev.trim() ? `${prev.trim()}\n${lines}` : lines;
                    })
                  }
                />
              </div>
            </div>

            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                {messages.common.cancel}
              </Button>
              <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
                {messages.teacher.createRoom}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
