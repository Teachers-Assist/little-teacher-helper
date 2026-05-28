'use client';

import { useState, useCallback } from 'react';
import { StudentList } from '@/components/StudentList';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SubmissionStatus } from '@/types';

interface Student {
  id: string;
  name: string;
  seatNumber?: number | null;
}

interface SubmissionFormProps {
  itemName: string;
  students: Student[];
  initialSubmissions?: { [studentId: string]: boolean };
  onSubmit: (submissions: { studentId: string; status: SubmissionStatus }[]) => Promise<void>;
  onCancel?: () => void;
}

export function SubmissionForm({
  itemName,
  students,
  initialSubmissions = {},
  onSubmit,
  onCancel,
}: SubmissionFormProps) {
  const [submissions, setSubmissions] = useState<{ [studentId: string]: boolean }>(initialSubmissions);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmissionChange = useCallback((studentId: string, submitted: boolean) => {
    setSubmissions((prev) => ({
      ...prev,
      [studentId]: submitted,
    }));
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submissionData = Object.entries(submissions).map(([studentId, submitted]) => ({
        studentId,
        status: submitted ? SubmissionStatus.SUBMITTED : SubmissionStatus.NOT_SUBMITTED,
      }));
      await onSubmit(submissionData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = () => {
    const allSelected: { [studentId: string]: boolean } = {};
    students.forEach((student) => {
      allSelected[student.id] = true;
    });
    setSubmissions(allSelected);
  };

  const handleDeselectAll = () => {
    const allDeselected: { [studentId: string]: boolean } = {};
    students.forEach((student) => {
      allDeselected[student.id] = false;
    });
    setSubmissions(allDeselected);
  };

  const submittedCount = Object.values(submissions).filter(Boolean).length;
  const totalCount = students.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{itemName}</CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge variant="success">✓ {submittedCount} 已繳</StatusBadge>
            <StatusBadge variant="danger">✗ {totalCount - submittedCount} 未繳</StatusBadge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            全選
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            取消全選
          </Button>
        </div>

        {/* Student List */}
        <StudentList
          students={students}
          submissions={submissions}
          onSubmissionChange={handleSubmissionChange}
        />

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            儲存登記
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SubmissionForm;

