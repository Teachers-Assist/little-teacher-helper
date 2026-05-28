'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

export default function NewRoomPage() {
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
      setError('請輸入班級名稱');
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
      if (!roomResponse.ok) throw new Error('建立房間失敗');
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
      setError('建立房間失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  if (!teacherId) return null;

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
        <h1 className="text-xl font-bold text-slate-900">建立新房間</h1>
      </div>

      <div className="page-body">
        <div className="mx-auto max-w-lg rounded-xl border border-[#ede9fe] bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Room Name */}
            <div>
              <label htmlFor="roomName" className="mb-1.5 block text-sm font-medium text-slate-700">
                班級名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="例如：三年二班"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                maxLength={100}
              />
            </div>

            {/* Student Names */}
            <div>
              <label htmlFor="studentNames" className="mb-1.5 block text-sm font-medium text-slate-700">
                學生名單（選填）
              </label>
              <p className="mb-2 text-xs text-slate-400">
                每行一位學生，可加上座號，例如：
                <code className="ml-1 rounded bg-slate-100 px-1 py-0.5">1 王小明</code>
              </p>
              <textarea
                id="studentNames"
                value={studentNames}
                onChange={(e) => setStudentNames(e.target.value)}
                placeholder={`1 王小明\n2 李小華\n3 張小強`}
                rows={8}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
                取消
              </Button>
              <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
                建立房間
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
