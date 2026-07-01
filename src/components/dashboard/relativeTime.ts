import type { Messages } from '@/messages';
import { formatDate } from '@/lib/utils';

/** 相對時間文字（002 US8）：剛剛 / N 分鐘前 / N 小時前 / 昨天 / 日期。 */
export function relativeTime(iso: string, messages: Messages, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return messages.teacher.dashboard.lastActivityToday;
  if (min < 60) return messages.teacher.dashboard.lastActivityMinutesAgo(min);
  const hours = Math.floor(min / 60);
  if (hours < 24) return messages.teacher.dashboard.lastActivityHoursAgo(hours);
  if (hours < 48) return messages.teacher.dashboard.lastActivityYesterday;
  return formatDate(new Date(iso));
}
