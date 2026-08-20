'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { StudentImport } from '@/components/StudentImport';
import { useMessages } from '@/i18n/MessagesProvider';
import { resolveError } from '@/i18n/resolveError';

/** 名單一行的格式：座號、空白、姓名。\s 涵蓋全形空白（U+3000），老師打全形空白沒問題。 */
const ROSTER_LINE = /^(\d{1,2})\s+(.+)$/;
/** 座號黏著姓名（「1王小明」）：座號其實看得見，只是少了空白，要講得比「看不出座號」精準。 */
const SEAT_WITHOUT_SPACE = /^\d{1,2}\S/;

export default function NewRoomPage() {
  const messages = useMessages();
  const [roomName, setRoomName] = useState('');
  const [studentNames, setStudentNames] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  // 班級建好、名單卻寫入失敗時保留 id：老師修正後再送出只補學生，不會多開一個班。
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
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
    const lines = studentNames
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // 認不出座號的行（例如漏了空格、用全形數字）以前會被當成「沒有座號」送出去，
    // 後端整批回 400 而畫面什麼都不說。改成送出前就先擋下並指名是哪一行。
    const badLine = lines.find((line) => !ROSTER_LINE.test(line));
    if (badLine) {
      setError(
        SEAT_WITHOUT_SPACE.test(badLine)
          ? messages.teacher.rosterLineNoSpace(badLine)
          : messages.teacher.rosterLineNoSeat(badLine)
      );
      return;
    }

    const students = lines.map((line) => {
      const match = line.match(ROSTER_LINE)!;
      return { seatNumber: parseInt(match[1], 10), name: match[2].trim() };
    });

    setIsLoading(true);
    setError('');
    try {
      // 上一次已經把班級建起來、只是名單沒進去時，這次只補學生。
      let roomId = createdRoomId;
      if (!roomId) {
        const roomResponse = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: roomName.trim(), teacherId }),
        });
        if (!roomResponse.ok) throw new Error('room create failed');
        const room = await roomResponse.json();
        roomId = room.id as string;
        setCreatedRoomId(roomId);
      }

      if (students.length > 0) {
        const res = await fetch(`/api/rooms/${roomId}/students/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students }),
        });
        // 批次寫入是全或無：失敗代表一個學生都沒進去，不能就這樣跳走。
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            messages.teacher.rosterSaveFailed(resolveError(messages, data.error, data.params))
          );
          return;
        }
      }
      router.push(`/teacher/rooms/${roomId}`);
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
