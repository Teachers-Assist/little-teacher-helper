import { and, eq, ne } from 'drizzle-orm';
import { student } from '@/db/schema';
import type { DB } from '@/lib/db';
import { ERROR_CODES, type ApiError } from '@/i18n/errorCodes';

// 座號的 unique 約束涵蓋已移除學生（座號同時是小老師的身份，重用會讓歷史經手記錄
// 無法歸屬），因此「座號已被佔用」有兩種老師感受完全不同的成因：
//   - 佔用者還在名單上   → 老師看得到，講「已存在」就夠
//   - 佔用者已被移除     → 老師在名單上找不到，必須點名是誰，否則無從查起
// 這裡查出佔用者，讓 route 能選對錯誤碼。

export interface SeatHolder {
  seatNumber: number;
  name: string;
  isRemoved: boolean;
}

/**
 * 找出班級中佔用該座號的學生（含已移除）。
 *
 * @param excludeStudentId 編輯既有學生時排除自己，否則會與自己的座號相撞。
 */
export async function findSeatHolder(
  db: DB,
  roomId: string,
  seatNumber: number,
  excludeStudentId?: string
): Promise<SeatHolder | null> {
  const rows = await db
    .select({
      seatNumber: student.seatNumber,
      name: student.name,
      isRemoved: student.isRemoved,
    })
    .from(student)
    .where(
      and(
        eq(student.roomId, roomId),
        eq(student.seatNumber, seatNumber),
        excludeStudentId ? ne(student.id, excludeStudentId) : undefined
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * 批次比對用的座號索引（匯入時一次撈全班，不逐列查）。
 * 兩者互斥：同一座號至多一位佔用者（unique 約束保證）。
 */
export function buildSeatIndex(existing: SeatHolder[]) {
  const activeSeats = new Set<number>();
  const removedBySeat = new Map<number, string>();
  for (const s of existing) {
    if (s.isRemoved) removedBySeat.set(s.seatNumber, s.name);
    else activeSeats.add(s.seatNumber);
  }
  return { activeSeats, removedBySeat };
}

/** 依佔用者是否已移除，回傳對應的 409 錯誤內容（已移除者一併帶出姓名與座號）。 */
export function seatConflictError(holder: SeatHolder): ApiError {
  if (!holder.isRemoved) {
    return { error: ERROR_CODES.STUDENT_SEAT_DUPLICATE };
  }
  return {
    error: ERROR_CODES.STUDENT_SEAT_DUPLICATE_REMOVED,
    params: { seatNumber: holder.seatNumber, name: holder.name },
  };
}
