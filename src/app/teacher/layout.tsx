import { TeacherSidebar } from '@/components/layout/TeacherSidebar';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sidebar-layout">
      <TeacherSidebar />
      <div className="app-main">
        {children}
      </div>
    </div>
  );
}
