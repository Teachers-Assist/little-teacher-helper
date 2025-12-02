'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StudentList } from '@/components/StudentList';
import { SubmissionStatus } from '@/types';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get offline data first
        const offlineData = JSON.parse(localStorage.getItem('helperOfflineData') || '{}');
        const cachedStudents = offlineData.students?.[roomId] || [];
        const cachedItems = offlineData.items?.[roomId] || [];
        const cachedItem = cachedItems.find((i: Item) => i.id === itemId);
        
        if (cachedItem) {
          setItem(cachedItem);
        }
        if (cachedStudents.length > 0) {
          setStudents(cachedStudents);
        }

        // Load cached submissions
        const cachedSubmissions = offlineData.submissions?.[itemId] || {};
        const submissionState: { [studentId: string]: boolean } = {};
        Object.entries(cachedSubmissions).forEach(([studentId, data]) => {
          submissionState[studentId] = (data as { status: string }).status === SubmissionStatus.SUBMITTED;
        });
        setSubmissions(submissionState);

        // Fetch fresh data
        const [studentsRes, submissionsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}/students`),
          fetch(`/api/items/${itemId}/submissions`),
        ]);

        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(studentsData);
        }

        if (submissionsRes.ok) {
          const submissionsData: Submission[] = await submissionsRes.json();
          const newSubmissionState: { [studentId: string]: boolean } = {};
          submissionsData.forEach((s) => {
            newSubmissionState[s.studentId] = s.status === SubmissionStatus.SUBMITTED;
          });
          setSubmissions(newSubmissionState);
        }

        // Fetch item if not in cache
        if (!cachedItem) {
          const itemRes = await fetch(`/api/items/${itemId}`);
          if (itemRes.ok) {
            setItem(await itemRes.json());
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [roomId, itemId]);

  const saveSubmission = useCallback(async (studentId: string, submitted: boolean) => {
    // Save to localStorage immediately (optimistic update)
    const offlineData = JSON.parse(localStorage.getItem('helperOfflineData') || '{}');
    offlineData.submissions = offlineData.submissions || {};
    offlineData.submissions[itemId] = offlineData.submissions[itemId] || {};
    offlineData.submissions[itemId][studentId] = {
      status: submitted ? SubmissionStatus.SUBMITTED : SubmissionStatus.NOT_SUBMITTED,
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    localStorage.setItem('helperOfflineData', JSON.stringify(offlineData));

    // Try to sync with server
    try {
      setIsSyncing(true);
      const response = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissions: [
            {
              studentId,
              itemId,
              status: submitted ? SubmissionStatus.SUBMITTED : SubmissionStatus.NOT_SUBMITTED,
            },
          ],
        }),
      });

      if (response.ok) {
        // Mark as synced
        offlineData.submissions[itemId][studentId].synced = true;
        localStorage.setItem('helperOfflineData', JSON.stringify(offlineData));
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to sync submission:', error);
      // Will be synced later when online
    } finally {
      setIsSyncing(false);
    }
  }, [itemId]);

  const handleSubmissionChange = (studentId: string, submitted: boolean) => {
    setSubmissions((prev) => ({
      ...prev,
      [studentId]: submitted,
    }));
    saveSubmission(studentId, submitted);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">📝</div>
          <p className="text-slate-600 dark:text-slate-300">載入中...</p>
        </div>
      </div>
    );
  }

  const submittedCount = Object.values(submissions).filter(Boolean).length;
  const totalCount = students.length;

  return (
    <div className="min-h-screen p-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/helper/${roomId}`} className="mb-2 block text-sky-500 hover:text-sky-600">
          ← 返回項目列表
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {item?.name || '登記項目'}
        </h1>
      </div>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StatusBadge variant="success" size="lg">
                ✓ {submittedCount} 已繳
              </StatusBadge>
              <StatusBadge variant="danger" size="lg">
                ✗ {totalCount - submittedCount} 未繳
              </StatusBadge>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              {isSyncing && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  同步中...
                </span>
              )}
              {lastSaved && !isSyncing && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  已儲存
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>學生名單</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentList
            students={students}
            submissions={submissions}
            onSubmissionChange={handleSubmissionChange}
          />
        </CardContent>
      </Card>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              完成度：{Math.round((submittedCount / totalCount) * 100) || 0}%
            </p>
          </div>
          <Link href={`/helper/${roomId}`}>
            <Button variant="primary">完成登記</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

