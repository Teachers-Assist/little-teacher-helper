'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Student {
  id: string;
  name: string;
  seatNumber?: number | null;
}

interface Report {
  item: {
    id: string;
    name: string;
    dueDate?: string | null;
  };
  summary: {
    total: number;
    submitted: number;
    notSubmitted: number;
    submissionRate: number;
  };
  submittedStudents: Student[];
  notSubmittedStudents: Student[];
}

interface ReportViewProps {
  itemId: string;
}

export function ReportView({ itemId }: ReportViewProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/items/${itemId}/report`);
        if (response.ok) {
          setReport(await response.json());
        } else {
          setError('無法載入報表');
        }
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('載入報表失敗');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [itemId]);

  const handleCopyText = async () => {
    try {
      const response = await fetch(`/api/items/${itemId}/report?format=text`);
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      alert('已複製到剪貼簿！');
    } catch {
      alert('複製失敗');
    }
  };

  const handlePrint = () => {
    window.open(`/api/items/${itemId}/report?format=print`, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mb-4 text-4xl animate-pulse">📊</div>
          <p className="text-slate-600 dark:text-slate-300">載入報表中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mb-4 text-4xl">😕</div>
          <p className="text-slate-600 dark:text-slate-300">{error || '無法載入報表'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{report.item.name}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyText}>
              📋 複製文字
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              🖨️ 列印
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {report.summary.submitted}
            </div>
            <div className="text-sm text-emerald-700 dark:text-emerald-300">已繳交</div>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {report.summary.notSubmitted}
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">未繳交</div>
          </div>
          <div className="rounded-xl bg-slate-100 dark:bg-slate-700 p-4 text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {report.summary.submissionRate}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">繳交率</div>
          </div>
        </div>

        {/* Not Submitted List */}
        {report.notSubmittedStudents.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <StatusBadge variant="danger">未繳交</StatusBadge>
              <span>({report.notSubmittedStudents.length} 人)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {report.notSubmittedStudents.map((student) => (
                <div
                  key={student.id}
                  className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm"
                >
                  {student.seatNumber && (
                    <span className="mr-1 text-red-400">{student.seatNumber}號</span>
                  )}
                  <span className="text-red-700 dark:text-red-300">{student.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted List */}
        {report.submittedStudents.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <StatusBadge variant="success">已繳交</StatusBadge>
              <span>({report.submittedStudents.length} 人)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {report.submittedStudents.map((student) => (
                <div
                  key={student.id}
                  className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm"
                >
                  {student.seatNumber && (
                    <span className="mr-1 text-emerald-400">{student.seatNumber}號</span>
                  )}
                  <span className="text-emerald-700 dark:text-emerald-300">{student.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Submitted */}
        {report.notSubmittedStudents.length === 0 && report.summary.total > 0 && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
              全班已繳交完成！
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReportView;

