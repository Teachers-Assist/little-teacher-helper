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
 * 常駐於學生名單外框正上方的「登記者：[座號]」身份標示（003 US3 / FR-070-071）。
 *
 * 對應 vision 第 7 節「承諾裝置」—— 讓「是誰登的、老師看得到」在每次登記時持續可見。
 * 視覺：靠左、大字級、依指派狀態分色的純文字標示（非盒狀 badge，較矮以免與鎖定 banner 視覺打架）。
 * - assigned：強調色 + 星星 + 進場 fade-in（僅 1 次）+ 小行字「你是老師指定的登記者！」
 * - notAssigned：灰系（非警告色）+ 小行字「你不是被指定的小老師>_<」
 * - noAssignment：中性深色 + 無小行字
 */
export function RecorderBadge({ seatNumber, assignmentState, onClick }: RecorderBadgeProps) {
  const messages = useMessages();
  const isAssigned = assignmentState === 'assigned';

  const toneClass = assignmentState === 'assigned' ? 'text-accent-700' : 'text-slate-900';

  const hint =
    assignmentState === 'assigned'
      ? messages.record.assignedHint
      : assignmentState === 'notAssigned'
        ? messages.record.notAssignedHint
        : null;

  const labelClass = cn(
    'inline-flex items-center gap-1.5 text-xl font-bold leading-tight',
    toneClass,
    // 進場 fade-in：CSS 動畫於掛載時播 1 次，不持續閃爍（FR-071）
    isAssigned && 'animate-fade-in',
    onClick && 'cursor-pointer hover:underline'
  );

  const content = (
    <>
      {isAssigned && <Icon name="lucide:star" size={20} className="text-accent-500" />}
      <span>
        {messages.record.recorderLabel}
        {messages.identity.seatLabel(seatNumber)}
      </span>
    </>
  );

  return (
    <div className="flex flex-col items-end">
      {onClick ? (
        <button type="button" onClick={onClick} className={labelClass}>
          {content}
        </button>
      ) : (
        <div className={labelClass}>{content}</div>
      )}
      {hint && <p className="mt-0.5 text-xs font-medium text-slate-400">{hint}</p>}
    </div>
  );
}

export default RecorderBadge;
