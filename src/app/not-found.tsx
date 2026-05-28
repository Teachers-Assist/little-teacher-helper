import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center">
        <div className="mb-4 text-8xl">🔍</div>
        <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-white">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-slate-700 dark:text-slate-300">
          找不到頁面
        </h2>
        <p className="mb-8 max-w-md text-slate-600 dark:text-slate-400">
          您要找的頁面可能已被移除、名稱已更改，或暫時無法使用。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/">
            <Button variant="primary">回到首頁</Button>
          </Link>
          <Link href="/teacher">
            <Button variant="outline">老師入口</Button>
          </Link>
          <Link href="/join">
            <Button variant="outline">小老師入口</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

