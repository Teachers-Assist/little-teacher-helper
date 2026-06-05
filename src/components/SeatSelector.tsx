'use client';

import { useMessages } from '@/i18n/MessagesProvider';

interface SeatStudent {
  id: string;
  name: string;
  seatNumber: number;
}

interface SeatSelectorProps {
  students: SeatStudent[];
  onSelect: (student: SeatStudent) => void;
}

/**
 * 小老師進入房間後選擇自己的座號（spec US2）。
 * 座號是登記者身分依據，系統會記錄是誰做的登記。
 */
export function SeatSelector({ students, onSelect }: SeatSelectorProps) {
  const messages = useMessages();
  const sorted = [...students].sort((a, b) => a.seatNumber - b.seatNumber);

  return (
    <div>
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-slate-900">{messages.identity.selectSeatTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{messages.identity.selectSeatHint}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((student) => (
          <button
            key={student.id}
            onClick={() => onSelect(student)}
            className="flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-black bg-white px-3 py-3 transition-colors hover:bg-accent-100 active:bg-accent-200"
          >
            <span className="text-lg font-bold text-primary-700">
              {messages.identity.seatLabel(student.seatNumber)}
            </span>
            <span className="max-w-full truncate text-sm text-slate-600">{student.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SeatSelector;
