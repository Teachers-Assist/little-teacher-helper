'use client';

import { useState, useEffect, use, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatusBadge, StatusBadgeVariant } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Menu } from '@/components/ui/Menu';
import { useToast } from '@/components/ui/Toast';
import { StudentRoster, type RosterStudent } from '@/components/StudentRoster';
import { StudentForm, type EditingStudent } from '@/components/StudentForm';
import { StudentImport } from '@/components/StudentImport';
import { RemovedStudentsDrawer } from '@/components/RemovedStudentsDrawer';
import { TaskForm, type EditingTask, type EditSource } from '@/components/TaskForm';
import { ArchivedTasksDrawer } from '@/components/ArchivedTasksDrawer';
import { MonitoringStats, type MonitoringStatsData } from '@/components/MonitoringStats';
import { MonitoringAlerts, type MonitoringWarning } from '@/components/MonitoringAlerts';
import { QRCodeModal } from '@/components/QRCodeModal';
import { Student, Task, TaskStatus } from '@/types';
import { getTaskDisplayState, type TaskBadge } from '@/lib/task';
import { cn, formatDate } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

interface Room {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

type TaskWithCount = Task & { _count?: { records: number } };

type ConfirmState =
  | { kind: 'removeStudent'; student: RosterStudent }
  | { kind: 'archiveTask'; task: TaskWithCount }
  | { kind: 'closeTask'; task: TaskWithCount }
  | null;

const sortStudents = (list: Student[]): Student[] =>
  [...list].sort((a, b) => a.seatNumber - b.seatNumber || a.name.localeCompare(b.name));

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const messages = useMessages();
  const toast = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<TaskWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // US8 反饋：班級狀況為預設首見視角（老師先看需要注意的事）
  const [activeTab, setActiveTab] = useState<'students' | 'tasks' | 'report'>('report');
  const formColRef = useRef<HTMLDivElement>(null);

  // US2 學生編輯 / 移除 / 已移除抽屜
  const [editingStudent, setEditingStudent] = useState<EditingStudent | null>(null);
  const [removedDrawerOpen, setRemovedDrawerOpen] = useState(false);

  // US3 任務編輯 / 封存 / 已封存抽屜
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null);
  const [editTaskSource, setEditTaskSource] = useState<EditSource>('normal');
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // US7：QRCode modal（與 ?qr=open URL 同步）
  const [qrOpen, setQrOpen] = useState(false);
  const setQrParam = (on: boolean) => {
    const url = new URL(window.location.href);
    if (on) url.searchParams.set('qr', 'open');
    else url.searchParams.delete('qr');
    window.history.replaceState(null, '', url.toString());
  };
  const openQr = () => {
    setQrOpen(true);
    setQrParam(true);
  };
  const closeQr = () => {
    setQrOpen(false);
    setQrParam(false);
  };

  // 班級狀況 tab（US4）：lazy 載入 monitoring 資料
  const [monitoring, setMonitoring] = useState<{
    stats: MonitoringStatsData;
    warnings: MonitoringWarning[];
  } | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomRes, studentsRes, tasksRes] = await Promise.all([
          fetch(`/api/rooms/${id}`),
          fetch(`/api/rooms/${id}/students`),
          fetch(`/api/tasks/${id}`),
        ]);
        if (roomRes.ok) setRoom(await roomRes.json());
        if (studentsRes.ok) setStudents(sortStudents(await studentsRes.json()));
        if (tasksRes.ok) {
          const data = (await tasksRes.json()) as TaskWithCount[];
          setTasks(data);
        }
      } catch (error) {
        console.error('Failed to fetch room data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // US6/US7：支援 ?tab= 深連結與 ?qr=open 自動開啟 modal
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const tab = sp.get('tab');
    if (tab === 'students' || tab === 'tasks' || tab === 'report') setActiveTab(tab);
    if (sp.get('qr') === 'open') setQrOpen(true);
  }, []);

  const seatOptions = useMemo(() => students.map((s) => s.seatNumber), [students]);

  // 反饋 #2：點編輯後捲動到表單，讓老師察覺編輯位置（手機尤其重要）。
  // 用 requestAnimationFrame 確保表單已進入編輯模式（高度可能改變）後再捲動。
  useEffect(() => {
    if (!editingStudent && !editingTask) return;
    const t = setTimeout(() => {
      formColRef.current?.scrollIntoView({ block: 'start' });
    }, 0);
    return () => clearTimeout(t);
  }, [editingStudent, editingTask]);

  // US4：開啟班級狀況 tab 時載入 monitoring（每次開啟都重新抓最新狀態）
  useEffect(() => {
    if (activeTab !== 'report') return;
    let active = true;
    setMonitoringLoading(true);
    fetch(`/api/rooms/${id}/monitoring`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setMonitoring(data);
      })
      .catch((e) => console.error('Failed to load monitoring:', e))
      .finally(() => {
        if (active) setMonitoringLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, id]);

  // ── 學生 handlers ────────────────────────────────────────────
  const handleStudentSaved = (student: Student, mode: 'add' | 'edit') => {
    setStudents((prev) =>
      mode === 'add'
        ? sortStudents([...prev, student])
        : sortStudents(prev.map((s) => (s.id === student.id ? student : s)))
    );
    if (mode === 'edit') setEditingStudent(null);
  };

  const handleRemoveStudent = async (student: RosterStudent) => {
    try {
      const res = await fetch(`/api/rooms/${id}/students/${student.id}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== student.id));
        if (editingStudent?.id === student.id) setEditingStudent(null);
      } else {
        toast.error(messages.common.error);
      }
    } catch (err) {
      console.error('Failed to remove student:', err);
      toast.error(messages.common.networkError);
    }
  };

  const handleStudentRestored = (student: Student) => {
    setStudents((prev) =>
      prev.some((s) => s.id === student.id) ? prev : sortStudents([...prev, student])
    );
  };

  // ── 任務 handlers ────────────────────────────────────────────
  const toEditingTask = (task: TaskWithCount): EditingTask => ({
    id: task.id,
    name: task.name,
    type: task.type,
    assignedSeatNumber: task.assignedSeatNumber,
    dueDate: task.dueDate,
    status: task.status,
  });

  const handleTaskSaved = (task: Task, mode: 'add' | 'edit') => {
    setTasks((prev) =>
      mode === 'add'
        ? [{ ...task, _count: { records: 0 } }, ...prev]
        : prev.map((t) => (t.id === task.id ? { ...t, ...task } : t))
    );
    setEditingTask(null);
    setEditTaskSource('normal');
  };

  const patchTaskStatus = async (task: TaskWithCount, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${id}/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Task;
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t)));
      } else {
        toast.error(messages.common.error);
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast.error(messages.common.networkError);
    }
  };

  const handleArchiveTask = async (task: TaskWithCount) => {
    try {
      const res = await fetch(`/api/tasks/${id}/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        if (editingTask?.id === task.id) {
          setEditingTask(null);
          setEditTaskSource('normal');
        }
      } else {
        toast.error(messages.common.error);
      }
    } catch (err) {
      console.error('Failed to archive task:', err);
      toast.error(messages.common.networkError);
    }
  };

  const handleTaskRestored = (task: Task) => {
    setTasks((prev) =>
      prev.some((t) => t.id === task.id) ? prev : [{ ...task, _count: { records: 0 } }, ...prev]
    );
  };

  const handleEditTask = (task: TaskWithCount) => {
    setEditTaskSource('normal');
    setEditingTask(toEditingTask(task));
  };

  const handleExtendDue = (task: TaskWithCount) => {
    setEditTaskSource('extendDue');
    setEditingTask(toEditingTask(task));
  };

  const handleReopen = (task: TaskWithCount) => {
    if (task.status === TaskStatus.HELPER_COMPLETED) {
      patchTaskStatus(task, TaskStatus.ACTIVE);
      return;
    }
    // CLOSED：dueDate 過往 → 開表單要求重設；未來 / null → 直接重開（FR-043 / FR-044）
    const dueExpired = !!task.dueDate && new Date(task.dueDate).getTime() < Date.now();
    if (dueExpired) {
      setEditTaskSource('reopen');
      setEditingTask(toEditingTask(task));
    } else {
      patchTaskStatus(task, TaskStatus.ACTIVE);
    }
  };

  // ── confirm dialog 派發 ──────────────────────────────────────
  const confirmContent = (() => {
    if (!confirm) return null;
    if (confirm.kind === 'removeStudent') {
      return {
        title: messages.teacher.studentList.removeConfirmTitle,
        message: messages.teacher.studentList.removeConfirmMessage(confirm.student.name),
        confirmVariant: 'danger' as const,
        onConfirm: () => handleRemoveStudent(confirm.student),
      };
    }
    if (confirm.kind === 'archiveTask') {
      return {
        title: messages.teacher.taskList.archiveConfirmTitle,
        message: messages.teacher.taskList.archiveConfirmMessage(confirm.task.name),
        confirmVariant: 'primary' as const,
        onConfirm: () => handleArchiveTask(confirm.task),
      };
    }
    return {
      title: messages.teacher.closeTitle,
      message: messages.teacher.closeConfirm,
      confirmVariant: 'primary' as const,
      onConfirm: () => patchTaskStatus(confirm.task, TaskStatus.CLOSED),
    };
  })();

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
          <Link href="/teacher" className="text-sm text-primary-600 hover:text-primary-700">
            {messages.nav.dashboard}
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'report', label: messages.teacher.classStatus.tab, icon: 'lucide:activity', count: null },
    {
      id: 'students',
      label: messages.teacher.tabStudents,
      icon: 'lucide:users',
      count: students.length,
    },
    {
      id: 'tasks',
      label: messages.teacher.tabTasks,
      icon: 'lucide:clipboard-list',
      count: tasks.length,
    },
  ] as const;

  const badgeMeta: Record<TaskBadge, { variant: StatusBadgeVariant; label: string }> = {
    IN_PROGRESS: { variant: 'success', label: messages.teacher.taskList.badgeInProgress },
    DUE_EXPIRED: { variant: 'danger', label: messages.teacher.taskList.badgeDueExpired },
    HELPER_COMPLETED: { variant: 'info', label: messages.teacher.taskList.badgeHelperCompleted },
    CLOSED: { variant: 'neutral', label: messages.teacher.taskList.badgeClosed },
  };

  return (
    <>
      <div className="page-header">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{room.name}</h1>
            <StatusBadge variant={room.isActive ? 'success' : 'neutral'} dot size="sm">
              {room.isActive ? messages.teacher.active : messages.teacher.inactive}
            </StatusBadge>
          </div>
          <Button variant="outline" size="sm" onClick={openQr}>
            <Icon name="lucide:qr-code" size={15} />
            {messages.teacher.qrcode.showButton}
          </Button>
        </div>
      </div>

      <div className="page-body room-detail-body">
        {/* US3：班級資訊上提至 tab 列之上，所有 tab 共用一份 */}
        <div className="card-sm mb-4 lg:shrink-0">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-xs text-slate-400">{messages.teacher.roomCodeLabel}</p>
              <p className="font-mono text-xl font-bold tracking-widest text-slate-900">
                {room.code}
              </p>
            </div>
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

        {/* Tabs */}
        <div className="mb-5 flex gap-1 border-b-2 border-black lg:shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                {
                  'border-b-2 border-primary-600 text-primary-700': activeTab === tab.id,
                  'text-slate-500 hover:text-slate-900': activeTab !== tab.id,
                }
              )}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
              {tab.count !== null && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab !== 'report' && (
          <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch">
            {/* 表單欄（反饋 #2/#3）：較大、置於右側（手機在下方），編輯時捲動至此 */}
            <div
              ref={formColRef}
              className="order-2 space-y-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto"
            >
              {activeTab === 'students' && (
                <>
                  <div className="card-sm">
                    <StudentForm
                      roomId={id}
                      editing={editingStudent}
                      onSaved={handleStudentSaved}
                      onCancelEdit={() => setEditingStudent(null)}
                    />
                  </div>
                  <div className="card-sm">
                    <h3 className="card-title">{messages.teacher.studentList.importTitle}</h3>
                    <StudentImport
                      roomId={id}
                      onImported={(created) =>
                        setStudents((prev) => sortStudents([...prev, ...created]))
                      }
                    />
                  </div>
                </>
              )}
              {activeTab === 'tasks' && (
                <>
                  <div className="card-sm">
                    <TaskForm
                      roomId={id}
                      editing={editingTask}
                      editSource={editTaskSource}
                      seatOptions={seatOptions}
                      onSaved={handleTaskSaved}
                      onCancelEdit={() => {
                        setEditingTask(null);
                        setEditTaskSource('normal');
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 列表欄（反饋 #3）：較小、置於左側（手機在上方） */}
            <div className="order-1 flex flex-col lg:w-2/5 lg:shrink-0 lg:min-h-0">
              {activeTab === 'students' && (
                <div className="card-sm flex flex-col lg:min-h-0 lg:flex-1">
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <h3 className="card-title mb-0">{messages.teacher.studentRoster}</h3>
                    <Button variant="outline" size="sm" onClick={() => setRemovedDrawerOpen(true)}>
                      <Icon name="lucide:archive" size={14} />
                      {messages.teacher.studentList.removedDrawer}
                    </Button>
                  </div>
                  <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                    <StudentRoster
                      students={students}
                      editingId={editingStudent?.id ?? null}
                      onEdit={(s) =>
                        setEditingStudent({ id: s.id, name: s.name, seatNumber: s.seatNumber })
                      }
                      onRemove={(s) => setConfirm({ kind: 'removeStudent', student: s })}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="card-sm flex flex-col lg:min-h-0 lg:flex-1">
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <h3 className="card-title mb-0">{messages.teacher.taskListTitle}</h3>
                    <Button variant="outline" size="sm" onClick={() => setArchivedDrawerOpen(true)}>
                      <Icon name="lucide:archive" size={14} />
                      {messages.teacher.taskList.archivedDrawer}
                    </Button>
                  </div>
                  {tasks.length === 0 ? (
                    <div className="py-10 text-center">
                      <Icon
                        name="lucide:clipboard-list"
                        size={36}
                        className="mx-auto mb-2 text-slate-200"
                      />
                      <p className="text-sm text-slate-500">{messages.teacher.noTasks}</p>
                      <p className="mt-1 text-xs text-slate-400">{messages.teacher.noTasksHint}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                      {tasks.map((task) => {
                        const display = getTaskDisplayState(task);
                        const badge = badgeMeta[display.badge];
                        return (
                          <div
                            key={task.id}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border-2 border-black bg-white px-3 py-2',
                              editingTask?.id === task.id && 'ring-2 ring-primary-400'
                            )}
                          >
                            {/* 資訊區（可點進細節）：badges 置於名稱上方，名稱/meta 取得整行寬度，避免被擠掉 */}
                            <Link
                              href={`/teacher/tasks/${id}/${task.id}`}
                              className="group min-w-0 flex-1"
                            >
                              <p className="truncate text-base font-bold text-slate-900 group-hover:text-primary-700 group-hover:underline">
                                <span className="mr-2">{task.name}</span>
                                <StatusBadge variant={badge.variant} size="sm">
                                  {badge.label}
                                </StatusBadge>
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                <span>
                                  {messages.teacher.recorded(
                                    task._count?.records ?? 0,
                                    students.length
                                  )}
                                </span>
                                {task.assignedSeatNumber != null && (
                                  <span>
                                    {messages.teacher.assignedSeatLabel(task.assignedSeatNumber)}
                                  </span>
                                )}
                                {task.dueDate && (
                                  <span>{messages.task.dueLabel(formatDate(task.dueDate))}</span>
                                )}
                              </div>
                            </Link>

                            {/* 操作區：inline 只留主操作（結案 / 重新開放），其餘收進 ⋮，維持每張卡右緣對齊 */}
                            <div className="flex shrink-0 items-center gap-1">
                              {display.actions.includes('close') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirm({ kind: 'closeTask', task })}
                                >
                                  {messages.teacher.close}
                                </Button>
                              )}
                              {display.actions.includes('reopen') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReopen(task)}
                                >
                                  <Icon name="lucide:rotate-ccw" size={13} />
                                  {messages.teacher.reopen}
                                </Button>
                              )}
                              <Menu
                                label={messages.common.edit(task.name)}
                                items={[
                                  ...(display.actions.includes('extendDue')
                                    ? [
                                        {
                                          label: messages.teacher.taskList.extendDue,
                                          icon: 'lucide:calendar-clock',
                                          onClick: () => handleExtendDue(task),
                                        },
                                      ]
                                    : []),
                                  {
                                    label: messages.teacher.taskList.edit,
                                    icon: 'lucide:pencil',
                                    onClick: () => handleEditTask(task),
                                  },
                                  {
                                    label: messages.teacher.taskList.archive,
                                    icon: 'lucide:archive',
                                    onClick: () => setConfirm({ kind: 'archiveTask', task }),
                                  },
                                ]}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* US4：班級狀況 tab —— 全寬統計 + 警告（取代原報表 tab） */}
        {activeTab === 'report' && (
          <div className="space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {monitoringLoading && !monitoring ? (
              <p className="py-10 text-center text-sm text-slate-400">{messages.common.loading}</p>
            ) : monitoring ? (
              <>
                <MonitoringStats stats={monitoring.stats} />
                <MonitoringAlerts roomId={id} warnings={monitoring.warnings} />
              </>
            ) : null}
          </div>
        )}
      </div>

      <RemovedStudentsDrawer
        roomId={id}
        open={removedDrawerOpen}
        onClose={() => setRemovedDrawerOpen(false)}
        onRestored={handleStudentRestored}
      />
      <ArchivedTasksDrawer
        roomId={id}
        open={archivedDrawerOpen}
        onClose={() => setArchivedDrawerOpen(false)}
        onRestored={handleTaskRestored}
      />
      <QRCodeModal roomCode={room.code} roomName={room.name} open={qrOpen} onClose={closeQr} />

      {confirmContent && (
        <ConfirmDialog
          open
          title={confirmContent.title}
          message={confirmContent.message}
          confirmVariant={confirmContent.confirmVariant}
          onConfirm={() => {
            confirmContent.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
