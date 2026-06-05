'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StudentList } from '@/components/StudentList';
import { ReportView } from '@/components/ReportView';
import { Student, Task, TaskType, TaskStatus } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { messages } from '@/messages/zh-TW';

interface Room {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  _count?: { students: number; tasks: number };
}

type TaskWithCount = Task & { _count?: { records: number } };

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<TaskWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSeat, setNewStudentSeat] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addError, setAddError] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'tasks' | 'report'>('students');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomRes, studentsRes, tasksRes] = await Promise.all([
          fetch(`/api/rooms/${id}`),
          fetch(`/api/rooms/${id}/students`),
          fetch(`/api/tasks/${id}`),
        ]);
        if (roomRes.ok) setRoom(await roomRes.json());
        if (studentsRes.ok) setStudents(await studentsRes.json());
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(data);
          if (data.length > 0) setSelectedTaskId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch room data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentSeat) return;
    setIsAddingStudent(true);
    setAddError('');
    try {
      const response = await fetch(`/api/rooms/${id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentName.trim(),
          seatNumber: parseInt(newStudentSeat, 10),
        }),
      });
      if (response.ok) {
        const student = await response.json();
        setStudents((prev) => [...prev, student]);
        setNewStudentName('');
        setNewStudentSeat('');
      } else {
        const data = await response.json();
        setAddError(data.error || messages.common.error);
      }
    } catch (error) {
      console.error('Failed to add student:', error);
      setAddError(messages.common.networkError);
    } finally {
      setIsAddingStudent(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="loading-icon mb-3 h-12 w-12">
            <Icon name="lucide:book-open" size={24} className="text-primary-600" />
          </div>
          <p className="text-sm text-slate-500">{messages.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Icon name="lucide:frown" size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="mb-3 text-slate-600">{messages.room.notFoundTitle}</p>
          <Link href="/teacher" className="text-sm text-primary-600 hover:text-primary-700">{messages.nav.dashboard}</Link>
        </div>
      </div>
    );
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const tabs = [
    { id: 'students', label: messages.teacher.tabStudents, icon: 'lucide:users', count: students.length },
    { id: 'tasks', label: messages.teacher.tabTasks, icon: 'lucide:clipboard-list', count: tasks.length },
    { id: 'report', label: messages.teacher.tabReport, icon: 'lucide:bar-chart-2', count: null },
  ] as const;

  return (
    <>
      <div className="page-header">
        <Link href="/teacher" className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600">
          <Icon name="lucide:arrow-left" size={14} />
          {messages.teacher.backToDashboard}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{room.name}</h1>
            <StatusBadge variant={room.isActive ? 'success' : 'neutral'} dot size="sm">
              {room.isActive ? messages.teacher.active : messages.teacher.inactive}
            </StatusBadge>
          </div>
          <Link href={`/teacher/rooms/${id}/qrcode`}>
            <Button variant="outline" size="sm">
              <Icon name="lucide:qr-code" size={15} />
              {messages.teacher.showQrcode}
            </Button>
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div className="mb-5 flex gap-1 border-b-2 border-black">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors', {
                'border-b-2 border-primary-600 text-primary-700': activeTab === tab.id,
                'text-slate-500 hover:text-slate-900': activeTab !== tab.id,
              })}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
              {tab.count !== null && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="card-sm">
              <h3 className="card-title">{messages.teacher.roomInfo}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400">{messages.teacher.roomCodeLabel}</p>
                  <p className="font-mono text-xl font-bold tracking-widest text-slate-900">{room.code}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-slate-400">{messages.teacher.studentCountLabel}</p>
                    <p className="text-lg font-semibold text-slate-900">{students.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{messages.teacher.taskCountLabel}</p>
                    <p className="text-lg font-semibold text-slate-900">{tasks.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {activeTab === 'students' && (
              <div className="card-sm">
                <h3 className="card-title">{messages.teacher.addStudent}</h3>
                <form onSubmit={handleAddStudent} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newStudentSeat}
                      onChange={(e) => setNewStudentSeat(e.target.value)}
                      placeholder={messages.teacher.seatPlaceholder}
                      min="1"
                      max="99"
                      required
                      className="input w-16 text-center"
                    />
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder={messages.teacher.studentNamePlaceholder}
                      className="input flex-1"
                      maxLength={50}
                    />
                  </div>
                  {addError && <p className="text-xs font-medium text-red-600">{addError}</p>}
                  <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isAddingStudent}>
                    {messages.teacher.add}
                  </Button>
                </form>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="card-sm">
                <h3 className="card-title">{messages.teacher.taskMgmtTitle}</h3>
                <p className="mb-3 text-xs text-slate-500">{messages.teacher.noTasksHint}</p>
                <Link href={`/teacher/tasks/${id}`}>
                  <Button variant="primary" size="sm" className="w-full">
                    <Icon name="lucide:settings-2" size={14} />
                    {messages.teacher.manageTask}
                  </Button>
                </Link>
              </div>
            )}

            {activeTab === 'report' && tasks.length > 0 && (
              <div className="card-sm">
                <h3 className="card-title">{messages.teacher.selectTask}</h3>
                <select
                  value={selectedTaskId || ''}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="input"
                >
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>{task.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Main */}
          <div className="lg:col-span-2">
            {activeTab === 'students' && (
              <div className="card-sm">
                <h3 className="card-title">{messages.teacher.studentRoster}</h3>
                <StudentList students={students} isReadOnly showSubmissionStatus={false} />
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="card-sm">
                <h3 className="card-title">{messages.teacher.taskListTitle}</h3>
                {tasks.length === 0 ? (
                  <div className="py-10 text-center">
                    <Icon name="lucide:clipboard-list" size={36} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm text-slate-500">{messages.teacher.noTasks}</p>
                    <p className="mt-1 text-xs text-slate-400">{messages.teacher.noTasksHint}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-lg border-2 border-black bg-white px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">{task.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                            <span>{messages.teacher.recorded(task._count?.records ?? 0, students.length)}</span>
                            {task.assignedSeatNumber != null && (
                              <span>{messages.teacher.assignedSeatLabel(task.assignedSeatNumber)}</span>
                            )}
                            {task.dueDate && <span>{messages.task.dueLabel(formatDate(task.dueDate))}</span>}
                          </div>
                        </div>
                        <div className="ml-3 flex flex-shrink-0 items-center gap-1.5">
                          <StatusBadge variant={task.type === TaskType.GRADE ? 'info' : 'neutral'} size="sm">
                            {task.type === TaskType.GRADE ? messages.task.typeGrade : messages.task.typeSubmission}
                          </StatusBadge>
                          {task.status === TaskStatus.HELPER_COMPLETED && (
                            <StatusBadge variant="success" size="sm">{messages.task.statusHelperCompleted}</StatusBadge>
                          )}
                          {task.status === TaskStatus.CLOSED && (
                            <StatusBadge variant="neutral" size="sm">{messages.task.statusClosed}</StatusBadge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'report' && (
              <>
                {tasks.length === 0 ? (
                  <div className="card-sm py-10 text-center">
                    <Icon name="lucide:bar-chart-2" size={36} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm text-slate-500">{messages.teacher.noTasks}</p>
                  </div>
                ) : selectedTask ? (
                  <ReportView task={selectedTask} roomName={room.name} students={students} />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
