'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StudentList } from '@/components/StudentList';
import { NetworkStatus } from '@/components/NetworkStatus';
import { SyncIndicator } from '@/components/SyncIndicator';
import { SubmissionStatus } from '@/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { saveSubmission } from '@/lib/offline/storage';
import { addToSyncQueue } from '@/lib/offline/queue';

interface Student {
  id: string;
  name: string;
  seatNumber?: number | null;
}

interface Item {
  id: string;
  name: string;
}

interface Submission {
  studentId: string;
  status: string;
}

export default function SubmissionPage({
  params,
}: {
  params: Promise<{ roomId: string; itemId: string }>;
}) {
  const { roomId, itemId } = use(params);
  const [item, setItem] = useState<Item | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<{ [studentId: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const offlineData = JSON.parse(localStorage.getItem('helperOfflineData') || '{}');
        const cachedStudents = offlineData.students?.[roomId] || [];
        const cachedItems = offlineData.items?.[roomId] || [];
        const cachedItem = cachedItems.find((i: Item) => i.id === itemId);
        if (cachedItem) setItem(cachedItem);
        if (cachedStudents.length > 0) setStudents(cachedStudents);

        const cachedSubmissions = offlineData.submissions?.[itemId] || {};
        const submissionState: { [studentId: string]: boolean } = {};
        Object.entries(cachedSubmissions).forEach(([studentId, data]) => {
          submissionState[studentId] = (data as { status: string }).status === SubmissionStatus.SUBMITTED;
        });
        setSubmissions(submissionState);

        if (isOnline) {
          const [studentsRes, submissionsRes] = await Promise.all([
            fetch(`/api/rooms/${roomId}/students`),
            fetch(`/api/items/${itemId}/submissions`),
          ]);
          if (studentsRes.ok) setStudents(await studentsRes.json());
          if (submissionsRes.ok) {
            const submissionsData: Submission[] = await submissionsRes.json();
            const newState: { [studentId: string]: boolean } = {};
            submissionsData.forEach((s) => {
              newState[s.studentId] = s.status === SubmissionStatus.SUBMITTED;
            });
            setSubmissions(newState);
          }
          if (!cachedItem) {
            const itemRes = await fetch(`/api/items/${itemId}`);
            if (itemRes.ok) setItem(await itemRes.json());
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [roomId, itemId, isOnline]);

  const saveSubmissionToServer = useCallback(
    async (studentId: string, submitted: boolean) => {
      const status = submitted ? SubmissionStatus.SUBMITTED : SubmissionStatus.NOT_SUBMITTED;
      saveSubmission(itemId, studentId, status, false);
      addToSyncQueue('UPDATE_SUBMISSION', { studentId, itemId, status });
      if (isOnline) {
        try {
          setIsSyncing(true);
          const response = await fetch('/api/submissions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissions: [{ studentId, itemId, status }] }),
          });
          if (response.ok) {
            saveSubmission(itemId, studentId, status, true);
            setLastSaved(new Date());
          }
        } catch (error) {
          console.error('Failed to sync submission:', error);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setLastSaved(new Date());
      }
    },
    [itemId, isOnline]
  );

  const handleSubmissionChange = (studentId: string, submitted: boolean) => {
    setSubmissions((prev) => ({ ...prev, [studentId]: submitted }));
    saveSubmissionToServer(studentId, submitted);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f7ff]">
        <div className="text-center">
          <div className="mb-3 inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary-100">
            <Icon name="lucide:pen-line" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">載入中...</p>
        </div>
      </div>
    );
  }

  const submittedCount = Object.values(submissions).filter(Boolean).length;
  const totalCount = students.length;
  const percentage = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f8f7ff] pb-24">
      {/* Header */}
      <div className="lp-header">
        <div className="lp-body-narrow" style={{ paddingTop: '0.875rem', paddingBottom: '0.875rem' }}>
          <Link
            href={`/helper/${roomId}`}
            className="mb-1.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600"
          >
            <Icon name="lucide:arrow-left" size={13} />
            返回項目列表
          </Link>
          <h1 className="text-lg font-bold text-slate-900">{item?.name || '登記項目'}</h1>
        </div>
      </div>

      <div className="lp-body-narrow space-y-3">
        <SyncIndicator />

        {/* Summary */}
        <div className="rounded-xl border border-[#ede9fe] bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <Icon name="lucide:check" size={14} />
                {submittedCount} 已繳
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600">
                <Icon name="lucide:x" size={14} />
                {totalCount - submittedCount} 未繳
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {isSyncing && (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  同步中...
                </>
              )}
              {lastSaved && !isSyncing && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {isOnline ? '已儲存' : '已暫存'}
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-slate-400">{percentage}%</p>
          </div>
        </div>

        {/* Student List */}
        <div className="rounded-xl border border-[#ede9fe] bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">學生名單</h3>
          <StudentList
            students={students}
            submissions={submissions}
            onSubmissionChange={handleSubmissionChange}
          />
        </div>

        <NetworkStatus />
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#ede9fe] bg-white/95 backdrop-blur-sm py-3">
        <div
          className="lp-body-narrow flex items-center justify-between"
          style={{ paddingTop: 0, paddingBottom: 0 }}
        >
          <div>
            <p className="text-sm font-medium text-slate-700">完成度 {percentage}%</p>
            {!isOnline && (
              <p className="text-xs text-amber-500">離線模式 — 連線後自動同步</p>
            )}
          </div>
          <Link href={`/helper/${roomId}`}>
            <Button variant="primary" size="sm">完成登記</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
