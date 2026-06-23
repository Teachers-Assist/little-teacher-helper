import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { getLocale } from '@/i18n/locale';
import { getMessages } from '@/messages';

export default async function NotFound() {
  const messages = getMessages(await getLocale());
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center">
        <div className="mb-4 text-8xl">🔍</div>
        <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-white">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-slate-700 dark:text-slate-300">
          {messages.errorPage.notFoundTitle}
        </h2>
        <p className="mb-8 max-w-md text-slate-600 dark:text-slate-400">
          {messages.errorPage.notFoundDesc}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/">
            <Button variant="primary">{messages.common.backHome}</Button>
          </Link>
          <Link href="/teacher">
            <Button variant="outline">{messages.errorPage.teacherEntry}</Button>
          </Link>
          <Link href="/join">
            <Button variant="outline">{messages.errorPage.helperEntry}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

