// 006 推廣示範沙盒——種子資料（T602）。
//
// 純資料模組（不落庫、不碰 D1）。id 一律**固定字串**，讓老師端與小老師端兩個視窗各自
// import 時對齊同一批 room/student/task（跨視窗同步靠 id 對齊，見 channel.ts / store.ts）。
// 時間戳一律相對 now 計算——任務 C 的 createdAt 設在 24h 前，確保 detectAnomalies 每次
// 載入都穩定觸發規則一 TASK_STALLED（spec FR-145 / §種子資料）。

import { SubmissionStatus, TaskStatus, TaskType } from '@/types';
import type { OfflineRecordEntry, Student, Task } from '@/types';
import type { HandlerAction } from '@/lib/recordHandlerRule';

export const DEMO_ROOM = {
  id: 'demo-room',
  code: 'DEMO01',
  name: '五年二班',
} as const;

/** 指定小老師座號，同時作為小老師端進場的預設座號（模擬「你是被指定的登記者」）。 */
export const DEMO_ASSIGNED_SEAT = 1;

const STUDENT_NAMES = ['王小明', '林曉華', '張博安', '李佳蓉', '陳冠宇', '黃品妍'];

const HOUR = 60 * 60 * 1000;

/** 一筆記錄的順序處理者名單項（鏡像正式 RecordHandler；demo 存於本機、不落庫）。 */
export interface DemoHandler {
  seatNumber: number;
  action: HandlerAction;
  handledAt: string;
}

export interface DemoSeed {
  room: typeof DEMO_ROOM;
  assignedSeat: number;
  students: Student[];
  tasks: Task[];
  records: { [taskId: string]: { [studentId: string]: OfflineRecordEntry } };
  // 與 records 平行的經手鏈（studentId → 依序處理者）；種子皆單筆（座號 1）→ 初始不觸發多人經手。
  handlers: { [taskId: string]: { [studentId: string]: DemoHandler[] } };
}

/**
 * 產生一份種子。時間戳相對 `now`（預設當下）計算。
 */
export function createDemoSeed(now: number = Date.now()): DemoSeed {
  const nowDate = new Date(now);

  const students: Student[] = STUDENT_NAMES.map((name, i) => ({
    id: `demo-s${i + 1}`,
    name,
    seatNumber: i + 1,
    roomId: DEMO_ROOM.id,
    isRemoved: false,
    createdAt: nowDate,
    updatedAt: nowDate,
  }));

  const baseTask = (over: Partial<Task> & Pick<Task, 'id' | 'name' | 'type'>): Task => ({
    roomId: DEMO_ROOM.id,
    assignedSeatNumber: DEMO_ASSIGNED_SEAT,
    dueDate: null,
    status: TaskStatus.ACTIVE,
    isArchived: false,
    archivedAt: null,
    createdAt: new Date(now - 2 * HOUR),
    updatedAt: new Date(now - 2 * HOUR),
    ...over,
  });

  const tasks: Task[] = [
    // A 繳交型：留 5、6 號未交，供試用者在小老師端補登、於老師端看見更新
    baseTask({
      id: 'demo-task-a',
      name: '校外教學同意書',
      type: TaskType.SUBMISSION,
      dueDate: new Date(now + 2 * 24 * HOUR),
    }),
    // B 成績型：展示「只能填數字」的資料型別
    baseTask({ id: 'demo-task-b', name: '數學小考', type: TaskType.GRADE }),
    // C 繳交型、零登記、createdAt 逾 24h → 觸發規則一 TASK_STALLED
    baseTask({
      id: 'demo-task-c',
      name: '午餐費',
      type: TaskType.SUBMISSION,
      createdAt: new Date(now - 25 * HOUR),
      updatedAt: new Date(now - 25 * HOUR),
    }),
  ];

  const iso = new Date(now - 90 * 60 * 1000).toISOString();
  const submitted = (): OfflineRecordEntry => ({
    submissionStatus: SubmissionStatus.SUBMITTED,
    recorderSeatNumber: DEMO_ASSIGNED_SEAT,
    isAssignedRecorder: true,
    updatedAt: iso,
  });
  const grade = (v: number): OfflineRecordEntry => ({
    gradeValue: v,
    recorderSeatNumber: DEMO_ASSIGNED_SEAT,
    isAssignedRecorder: true,
    updatedAt: iso,
  });

  const records: DemoSeed['records'] = {
    'demo-task-a': {
      'demo-s1': submitted(),
      'demo-s2': submitted(),
      'demo-s3': submitted(),
      'demo-s4': submitted(),
    },
    'demo-task-b': {
      'demo-s1': grade(85),
      'demo-s2': grade(92),
      'demo-s3': grade(78),
      'demo-s4': grade(88),
    },
    'demo-task-c': {},
  };

  // 種子經手鏈：每筆記錄皆由指定座號 1 單獨經手 → 初始無多人經手 badge，
  // 留給試用者親手換座號重登、製造 ≥2 個不同座號的經手鏈。
  const seedHandler = (): DemoHandler[] => [
    { seatNumber: DEMO_ASSIGNED_SEAT, action: 'RECORD', handledAt: iso },
  ];
  const handlers: DemoSeed['handlers'] = {
    'demo-task-a': Object.fromEntries(
      Object.keys(records['demo-task-a']).map((sid) => [sid, seedHandler()])
    ),
    'demo-task-b': Object.fromEntries(
      Object.keys(records['demo-task-b']).map((sid) => [sid, seedHandler()])
    ),
    'demo-task-c': {},
  };

  return { room: DEMO_ROOM, assignedSeat: DEMO_ASSIGNED_SEAT, students, tasks, records, handlers };
}
