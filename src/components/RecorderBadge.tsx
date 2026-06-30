'use client';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useMessages } from '@/i18n/MessagesProvider';

/** 小老師相對於此任務的指派狀態（003 US3） */
export type AssignmentState = 'assigned' | 'notAssigned' | 'noAssignment';

interface RecorderBadgeProps {
  seatNumber: number;
  assignmentState: AssignmentState;
  /** 點擊觸發換座號流程（US4）；不傳則為純展示、不可點 */
  onClick?: () => void;
}

/**
 * 常駐於學生名單外框正上方的「登記者：[座號]」大型 badge（003 US3 / FR-070-071）。
 *
 * 對應 vision 第 7 節「承諾裝置」—— 讓「是誰登的、老師看得到」這件事在每次登記時
 * 都持續可見。依三種指派狀態分流視覺：
 * - assigned：強調色 + 星星 + 進場 fade-in（僅 1 次）+ 小行字「你是老師指定的登記者！」
 * - notAssigned：灰藍系（非警告色）+ 小行字「你不是被指定的小老師>_<」
 * - noAssignment：中性純黑邊白底 + 無小行字
 */
export function RecorderBadge({ seatNumber, assignmentState, onClick }: RecorderBadgeProps) {
  const messages = useMessages();
  const isAssigned = assignmentState === 'assigned';

  const toneClass =
    assignmentState === 'assigned'
      ? 'bg-accent-200 text-slate-900'
      : assignmentState === 'notAssigned'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-white text-slate-900';

  const hint =
    assignmentState === 'assigned'
      ? messages.record.assignedHint
      : assignmentState === 'notAssigned'
        ? messages.record.notAssignedHint
        : null;

  const badgeClass = cn(
    'inline-flex items-center gap-2 rounded-xl border-2 border-black px-5 py-2.5 text-lg font-bold',
    toneClass,
    // 進場 fade-in：CSS 動畫於掛載時播 1 次，不持續閃爍（FR-071）
    isAssigned && 'animate-fade-in',
    onClick && 'cursor-pointer transition-all hover:-translate-x-px hover:-translate-y-px'
  );

  const content = (
    <>
      {isAssigned && <Icon name="lucide:star" size={18} className="text-accent-600" />}
      <span>
        {messages.record.recorderLabel}
        {messages.identity.seatLabel(seatNumber)}
      </span>
    </>
  );

  return (
    <div className="text-center">
      {onClick ? (
        <button type="button" onClick={onClick} className={badgeClass}>
          {content}
        </button>
      ) : (
        <div className={badgeClass}>{content}</div>
      )}
      {hint && <p className="mt-1.5 text-xs font-medium text-slate-500">{hint}</p>}
    </div>
  );
}

export default RecorderBadge;
