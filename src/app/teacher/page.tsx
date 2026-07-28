'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ClassesView } from '@/components/dashboard/ClassesView';
import { TasksView } from '@/components/dashboard/TasksView';
import type { DashboardData } from '@/components/dashboard/types';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

type View = 'classes' | 'tasks';
const VIEW_KEY = 'dashboardView';

export default function TeacherDashboard() {
  const messages = useMessages();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // US2：區分「真的沒有班級」與「讀不到資料」。null=正常；否則為無法確認的成因。
  const [loadError, setLoadError] = useState<'network' | 'server' | null>(null);
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<View | null>(null);
  // 換裝置還原連結（?tid=）帶進來的連結若無效、且本機「沒有」既有 session 時，
  // 於建立帳號畫面上方提示。
  const [restoreFailed, setRestoreFailed] = useState(false);
  // 還原連結無效、但本機「已有」老師 session：顯示阻斷式提示，覆蓋側欄（不洩漏原身份），
  // 且不清除 localStorage。老師確認後才回到自己的儀表板。
  const [invalidWithSession, setInvalidWithSession] = useState(false);
  // 還原連結指向「另一位」老師（與本機既有 teacherId 不同）時，覆蓋前要老師確認。
  const [pendingSwitch, setPendingSwitch] = useState<{
    fromName: string;
    toId: string;
    toName: string;
  } | null>(null);

  useEffect(() => {
    // 還原連結入口：/teacher?tid=<teacherId>（設定選單「複製我的還原連結」產生）。
    const tid = new URLSearchParams(window.location.search).get('tid');
    if (tid) {
      (async () => {
        try {
          const res = await fetch(`/api/teachers/${encodeURIComponent(tid)}`);
          if (res.ok) {
            const teacher = (await res.json()) as { id: string; name: string };
            const existingId = localStorage.getItem('teacherId');
            const existingName = localStorage.getItem('teacherName') || '';

            // 這個瀏覽器已是「另一位」老師：覆蓋前先問，避免誤把 A 擠掉（切回去需要 A 的連結）。
            // 先把 ?tid= 從網址清掉再顯示對話框；老師身份此刻尚未變動。
            if (existingId && existingId !== teacher.id) {
              window.history.replaceState(null, '', '/teacher');
              setPendingSwitch({ fromName: existingName, toId: teacher.id, toName: teacher.name });
              setIsLoading(false);
              return;
            }

            // 沒有既有身份、或就是同一位老師（等同 no-op）：直接寫回並整頁 replace。
            // 這一步同時清掉 ?tid= 又讓側欄等以 localStorage 為源的元件讀到身份，不需再清一次。
            localStorage.setItem('teacherId', teacher.id);
            localStorage.setItem('teacherName', teacher.name);
            window.location.replace('/teacher');
            return;
          }
        } catch {
          // 落到下方無效處理
        }
        // 連結無效／失效：先清掉網址上的 ?tid=（但 MUST NOT 動 localStorage）。
        window.history.replaceState(null, '', '/teacher');
        const keepId = localStorage.getItem('teacherId');
        const keepName = localStorage.getItem('teacherName');
        if (keepId && keepName) {
          // 本機已有老師 session：顯示阻斷式「連結無效」提示，覆蓋側欄不洩漏原身份，
          // 也不清除原資料；老師確認後才回自己的儀表板。
          setInvalidWithSession(true);
          setIsLoading(false);
        } else {
          // 本機沒有既有 session：回建立帳號畫面並提示（沒有原資料可隱藏）。
          setRestoreFailed(true);
          setShowCreateTeacher(true);
          setIsLoading(false);
        }
      })();
      return;
    }

    const storedTeacherId = localStorage.getItem('teacherId');
    const storedTeacherName = localStorage.getItem('teacherName');
    if (storedTeacherId && storedTeacherName) {
      setTeacherId(storedTeacherId);
      setTeacherName(storedTeacherName);
      fetchDashboard(storedTeacherId);
    } else {
      setShowCreateTeacher(true);
      setIsLoading(false);
    }
  }, []);

  // 確認切換：寫回新身份並整頁 replace（重載讓側欄等讀到新身份）。
  const confirmSwitch = () => {
    if (!pendingSwitch) return;
    localStorage.setItem('teacherId', pendingSwitch.toId);
    localStorage.setItem('teacherName', pendingSwitch.toName);
    window.location.replace('/teacher');
  };

  // 取消切換：維持原本的老師，載入其 dashboard（?tid= 先前已清掉）。
  const cancelSwitch = () => {
    setPendingSwitch(null);
    const id = localStorage.getItem('teacherId');
    const name = localStorage.getItem('teacherName');
    if (id && name) {
      setTeacherId(id);
      setTeacherName(name);
      fetchDashboard(id);
    } else {
      setShowCreateTeacher(true);
      setIsLoading(false);
    }
  };

  // 無效連結（但本機有 session）：關掉提示，回到原本老師的 dashboard（localStorage 未動）。
  const dismissInvalidLink = () => {
    setInvalidWithSession(false);
    const id = localStorage.getItem('teacherId');
    const name = localStorage.getItem('teacherName');
    if (id && name) {
      setTeacherId(id);
      setTeacherName(name);
      fetchDashboard(id);
    } else {
      setShowCreateTeacher(true);
      setIsLoading(false);
    }
  };

  const fetchDashboard = async (id: string) => {
    setIsLoading(true);
    setLoadError(null);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoadError('network');
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/teachers/${id}/dashboard`);
      if (!res.ok) {
        // 讀不到資料時 MUST NOT 落入「0 班 / 一切正常」，否則老師會誤信（FR-086 / SC-020）
        setLoadError('server');
        return;
      }
      const d = (await res.json()) as DashboardData;
      setData(d);
      // 預設 tab：1 班 → 按任務；≥2 班 → 按班級（FR-052）。
      // 使用者主動切換暫存於 sessionStorage（不持久化）。
      const stored = sessionStorage.getItem(VIEW_KEY) as View | null;
      setView(stored ?? (d.stats.roomCount >= 2 ? 'classes' : 'tasks'));
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      setLoadError('network');
    } finally {
      setIsLoading(false);
    }
  };

  const switchView = (v: View) => {
    setView(v);
    sessionStorage.setItem(VIEW_KEY, v);
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
        setIsLoading(true);
        fetchDashboard(teacher.id);
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

  // 還原連結指向另一位老師：覆蓋前先確認（?tid= 已在 effect 內清掉）。
  if (pendingSwitch) {
    return (
      <div className="h-full min-h-[80vh]">
        <ConfirmDialog
          open
          title={messages.teacher.restore.switchTitle}
          message={messages.teacher.restore.switchBody(pendingSwitch.fromName, pendingSwitch.toName)}
          confirmLabel={messages.teacher.restore.switchConfirm(pendingSwitch.toName)}
          cancelLabel={messages.teacher.restore.switchCancel(pendingSwitch.fromName)}
          onConfirm={confirmSwitch}
          onCancel={cancelSwitch}
        />
      </div>
    );
  }

  // 還原連結無效、但本機已有 session：整片不透明覆蓋（含側欄，z-50 > 側欄 z-20），
  // 不顯示任何原 localStorage 身份/班級，也不清除資料；老師確認後才回自己的儀表板。
  if (invalidWithSession) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#fffbeb] px-4">
        <div className="w-full max-w-sm rounded-xl border-2 border-black bg-white p-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
            <Icon name="lucide:link-2-off" size={24} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {messages.teacher.restore.invalidTitle}
          </h2>
          <p className="mt-1 mb-6 text-sm text-slate-500">
            {messages.teacher.restore.invalidKeepBody}
          </p>
          <Button variant="primary" className="w-full" onClick={dismissInvalidLink}>
            {messages.teacher.restore.invalidContinue}
          </Button>
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
            <h2 className="text-xl font-bold text-slate-900">
              {messages.teacher.createTeacherTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{messages.teacher.createTeacherHint}</p>
          </div>
          {restoreFailed && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-xs text-amber-700">
              <Icon name="lucide:link-2-off" size={15} className="mt-px shrink-0" />
              <span>{messages.teacher.restore.linkInvalid}</span>
            </div>
          )}
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

  const roomCount = data?.stats.roomCount ?? 0;

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {messages.teacher.welcome(teacherName)}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{messages.teacher.manageRooms}</p>
        </div>
        <Link href="/teacher/rooms/new">
          <Button variant="primary" size="sm">
            <Icon name="lucide:plus" size={16} />
            {messages.teacher.createRoom}
          </Button>
        </Link>
      </div>

      <div className="page-body space-y-5">
        {loadError && !data ? (
          // US2：讀不到資料——MUST NOT 顯示「還沒有班級」（老師會誤以為班級不見了）
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Icon name="lucide:cloud-off" size={32} className="text-slate-400" />
            <div>
              <p className="text-base font-semibold text-slate-700">
                {messages.teacher.dashboard.loadFailed}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {loadError === 'network'
                  ? messages.teacher.classStatus.unavailableNetwork
                  : messages.teacher.classStatus.unavailableServer}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => teacherId && fetchDashboard(teacherId)}
            >
              {messages.teacher.classStatus.retry}
            </Button>
          </div>
        ) : roomCount === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cabdff] bg-white py-16 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50">
              <Icon name="lucide:school" size={28} className="text-primary-400" />
            </div>
            <h2 className="mb-1.5 text-base font-semibold text-slate-900">
              {messages.teacher.noRoomsTitle}
            </h2>
            <p className="mb-5 text-sm text-slate-500">{messages.teacher.dashboard.createFirstClass}</p>
            <Link href="/teacher/rooms/new">
              <Button variant="primary" size="sm">
                {messages.teacher.createFirstRoom}
              </Button>
            </Link>
          </div>
        ) : (
          data && (
            <>
              <DashboardStats stats={data.stats} />

              {/* 雙視角 tab */}
              <div className="flex gap-1 border-b-2 border-black">
                {([
                  { id: 'classes', label: messages.teacher.dashboard.byClass, icon: 'lucide:layout-grid' },
                  { id: 'tasks', label: messages.teacher.dashboard.byTask, icon: 'lucide:list' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => switchView(t.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                      {
                        'border-b-2 border-primary-600 text-primary-700': view === t.id,
                        'text-slate-500 hover:text-slate-900': view !== t.id,
                      }
                    )}
                  >
                    <Icon name={t.icon} size={14} />
                    {t.label}
                  </button>
                ))}
              </div>

              {view === 'classes' ? (
                <ClassesView rooms={data.rooms} />
              ) : (
                <TasksView tasks={data.tasks} />
              )}
            </>
          )
        )}
      </div>
    </>
  );
}
