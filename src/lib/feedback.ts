// 意見回饋 Google 表單的預填連結。
//
// 兩個入口，各自預填不同的東西：
//   1. 老師端側欄「設定及問題回報」→ 回報問題（A1=bug），帶上畫面／時間／班級代碼／版本
//   2. 首頁「給我們建議或是回報問題」→ 功能建議（A1=idea），只帶版本
//
// 範圍：只處理「有網路、點了就開表單」這條路。離線暫存刻意不做。
// 相關文件：specs/research/feedback-接法.md、specs/research/google-form-builder.gs

// ─────────────────────────────────────────────────────────
// 1. 表單常數（由 google-form-builder.gs 的 logEntryIds() 產生）
// ─────────────────────────────────────────────────────────

/**
 * 表單的**填答**網址（表單「傳送 → 連結」那一條），結尾必須是 ?usp=pp_url。
 *
 * 注意這裡要的是填答 id（56 碼、開頭 `1FAIpQLS`），不是 `form.getId()` 的 44 碼
 * Drive 檔案 id——後者放進 `/forms/d/e/.../viewform` 對填答者會 404。
 */
const FORM_BASE =
  'https://docs.google.com/forms/d/e/1FAIpQLSecxiZQ8ZDj1b0plcjISAvffSnpDtnuP467a8cqxBCZJ8P36Q/viewform?usp=pp_url';

// entry.1316390515	[A1] 你想告訴我們什麼
// entry.299067725	[B1] 出問題的畫面
// entry.1621156753	[B2] 出問題的裝置
// entry.1166497883	[B3] 這是誰遇到的
// entry.310936786	[B4] 當時的網路狀況
// entry.1348108752	[B5] 畫面上當時的同步狀態
// entry.1822303923	[B6] 你本來想做什麼
// entry.151874823	[B7] 你按了哪些地方？照順序描述
// entry.1370325313	[B8] 你以為會發生什麼（預期行為）
// entry.1259149079	[B9] 實際上發生了什麼（實際發生的問題）
// entry.472978977	[B10] 發生的頻率
// entry.819579805	[B11] 嚴重程度
// entry.994150847	[B12] 大約發生時間
// entry.60202446	[B13] 班級代碼
// entry.203097415	[B14] 螢幕截圖（可略過）
// entry.1105077467	[B15] 還有什麼想補充的
// entry.766513467	[X1] 系統版本
// entry.1530928274	[S1] 這個建議是關於
// entry.1622506499	[S2] 你希望它可以做到什麼
// entry.1332142513	[S3] 現在沒有這個功能的時候 你都怎麼處理
// entry.1061073846	[S4] 如果一直沒有這個功能
// entry.533985072	[S5] 以下這些我們正在考慮的功能 你最想要哪些
// entry.1448566415	[S6] 承上，你覺得這個功能有多重要
// entry.1475875113	[Z1] 你使用這個系統多久了
// entry.717457350	[Z2] Email
//
// 註：這份對照表與 google-form-builder.gs 的題號不完全一致——實際建出來的表單
// 沒有 .gs 裡的 [A1] 你的身分 與 [Z3] 線上訪談，且分流題（你想告訴我們什麼）
// 就是這裡的 A1。以這份對照表為準，它是從真表單撈出來的。
export const FEEDBACK_ENTRY = {
  A1: 'entry.1316390515',
  B1: 'entry.299067725',
  B2: 'entry.1621156753',
  B3: 'entry.1166497883',
  B4: 'entry.310936786',
  B5: 'entry.1348108752',
  B6: 'entry.1822303923',
  B7: 'entry.151874823',
  B8: 'entry.1370325313',
  B9: 'entry.1259149079',
  B10: 'entry.472978977',
  B11: 'entry.819579805',
  B12: 'entry.994150847',
  B13: 'entry.60202446',
  B14: 'entry.203097415',
  B15: 'entry.1105077467',
  X1: 'entry.766513467',
  S1: 'entry.1530928274',
  S2: 'entry.1622506499',
  S3: 'entry.1332142513',
  S4: 'entry.1061073846',
  S5: 'entry.533985072',
  S6: 'entry.1448566415',
  Z1: 'entry.1475875113',
  Z2: 'entry.717457350',
} as const;

// 刻意不預填的欄位，理由集中寫在這裡（每一條都是「填了會比留空更糟」）：
//
// [B2] 出問題的裝置 —— 回報入口只在老師端側欄，學生的平板上根本點不到。
//      能測到的一定是老師手上這台，填進去等於謊報成「老師的電腦」，
//      而學生裝置上的問題正是最需要如實記錄的那一類。
// [B4] 當時的網路狀況 —— 能測到的只有「按下回報的當下」，不是「出問題的當下」。
//      老師事後回報時一律會變成「正常」。
// [B5] 畫面上當時的同步狀態 —— 同上：同步佇列是小老師端的（useSyncStatus 讀的是
//      本機 IndexedDB 佇列），老師這台的佇列永遠是空的，測到的不是學生看到的那行字。
//
// 共同的道理：錯的預填比空著更糟，因為它看起來合理，老師就不會去改它。
// 這三欄在表單裡都是選填或可改，交給填答者自己回想比較誠實。

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

// ─────────────────────────────────────────────────────────
// 2. 選項字串
// ─────────────────────────────────────────────────────────
// ⚠️ 這些字串必須與 Google 表單的選項**一字不差**（含全形｜與中文）。
//    差一個字，該欄的預填會**靜默失效**——不會報錯，只會留空。
//    單一真實來源是 google-form-builder.gs 的 OPT 常數；改表單就要回來改這裡。

/** [A1] 分流題。選了哪一項，表單就跳到對應的區段。 */
export const INTENT = {
  bug: 'bug｜回報問題（有東西怪怪的、壞掉了）',
  idea: 'idea｜功能建議（我希望它可以⋯）',
  both: 'both｜兩個都有',
} as const;

/**
 * [B1] 出問題的畫面。
 *
 * 這份表要與表單選項完整對應（改表單要回來改這裡），但**不代表每一項都能預填**——
 * 實際填得出哪些，見 screenFromPath 與 setFeedbackScreen 的說明。
 */
export const SCREEN = {
  teacherDashboard: 'teacher-dashboard｜老師首頁（儀表板）',
  teacherRoomStudents: 'teacher-room-students｜班級－學生名單',
  teacherRoomTasks: 'teacher-room-tasks｜班級－任務清單',
  teacherRoomStatus: 'teacher-room-status｜班級－班級狀況',
  teacherTaskDetail: 'teacher-task-detail｜任務細節／結果頁',
  teacherQrcode: 'teacher-qrcode｜QRCode 分享視窗',
  teacherImport: 'teacher-import｜Excel 匯入學生',
  teacherRestore: 'teacher-restore｜還原連結／換裝置',
  joinScan: 'join-scan｜小老師掃碼進班',
  joinSeat: 'join-seat｜選座號／自我聲明',
  helperTaskList: 'helper-task-list｜小老師任務清單',
  helperRecord: 'helper-record｜小老師登記畫面',
  other: 'other｜其他',
  unknown: 'unknown｜不確定／想不起來',
} as const;

// ─────────────────────────────────────────────────────────
// 3. 目前畫面：由頁面自己回報
// ─────────────────────────────────────────────────────────

/**
 * 為什麼不能只靠 usePathname：
 *
 * 班級頁三個 tab（學生名單／任務清單／班級狀況）共用同一條路由 `/teacher/rooms/[id]`，
 * 切 tab 只改 React state、**不會寫回網址**（page.tsx 只在 mount 時讀一次 ?tab=）。
 * 也就是說網址上的 ?tab= 至多只反映「進頁時」的 tab，之後就過期了。
 * 三選一猜錯的機率是 2/3，比留空更糟。
 *
 * 所以改成：**有能力知道自己是哪個畫面的頁面，自己回報**。
 * 沒回報的頁面（儀表板等）才退回 screenFromPath 由路由推導。
 *
 * 用 module 變數而不是 sessionStorage：回報入口在側欄、頁面在 children，兩者無法傳 props，
 * 但同屬一個 client bundle，共用同一份 module 實例。而且離開頁面時會跟著清掉，
 * 不會像 sessionStorage 那樣把上一個班級的代碼留到下一頁去。
 */
export interface ReportedScreen {
  screen: string;
  /** 班級代碼（QRCode 旁那 6 個字），用來去查那個班級當下的紀錄。 */
  roomCode?: string;
}

let reportedScreen: ReportedScreen | null = null;

/** 頁面在 useEffect 裡呼叫；unmount 時傳 null 清掉。 */
export function setFeedbackScreen(next: ReportedScreen | null): void {
  reportedScreen = next;
}

/**
 * 由目前路由推導「在哪個畫面」——只在頁面沒有自己回報時使用。
 *
 * 只處理 `/teacher/*`：回報入口只存在於老師端側欄（TeacherSidebar → SettingsMenu），
 * 小老師端與 /join 的頁面上點不到這個按鈕，所以那些路由分支永遠不會被走到。
 * 學生端遇到的問題由老師代填，那時 [B1] 本來就該由老師自己選。
 *
 * 推不出來的畫面（都是 modal／浮層，沒有自己的路由）：
 * - teacher-qrcode：QRCode modal 蓋住整個畫面，開著的時候點不到側欄
 * - teacher-restore：還原連結的警告視窗跟回報入口在同一個選單裡，不可能同時開著
 * - teacher-import：Excel 匯入是學生 tab 裡的一張卡片，與名單同屬一個畫面
 * 這三項留給老師自己選。
 */
export function screenFromPath(pathname: string): string {
  if (pathname.startsWith('/teacher/tasks/')) return SCREEN.teacherTaskDetail;

  // 建立班級沒有對應的表單選項
  if (pathname === '/teacher/rooms/new') return SCREEN.other;

  // 班級頁應該已由 setFeedbackScreen 回報；走到這裡代表資料還沒載完
  if (/^\/teacher\/rooms\/[^/]+$/.test(pathname)) return SCREEN.unknown;

  if (pathname.startsWith('/teacher')) return SCREEN.teacherDashboard;

  return SCREEN.unknown;
}

// ─────────────────────────────────────────────────────────
// 4. 組預填連結
// ─────────────────────────────────────────────────────────

export interface FeedbackContext {
  /** 分流題。決定表單開在「回報問題」還是「功能建議」那一段。 */
  intent: (typeof INTENT)[keyof typeof INTENT];
  screen?: string;
  occurredAt?: Date;
  roomCode?: string;
}

/** 蒐集老師端的目前情境。在點「回報問題」的當下同步呼叫。 */
export function collectFeedbackContext(pathname: string): FeedbackContext {
  return {
    intent: INTENT.bug,
    screen: reportedScreen?.screen ?? screenFromPath(pathname),
    occurredAt: new Date(),
    roomCode: reportedScreen?.roomCode,
  };
}

/**
 * DateTime 題的預填參數：拆成 _year / _month / _day / _hour / _minute 五個。
 * 已對這份表單實測過，五個參數都會正確帶入。
 *
 * 註：這裡填的是「按下回報的當下」，嚴格說也不是「出問題的當下」。之所以還是填，
 * 是因為老師多半是遇到當下就回報，誤差幾分鐘不影響對系統紀錄；而且日期時間欄
 * 一眼就看得出對不對，老師事後補報時會自己改——這點跟 [B4] 網路狀況不同，
 * 那一欄改成別的值看起來一樣合理，所以不填。
 */
function appendOccurredAt(p: URLSearchParams, d: Date): void {
  const base = FEEDBACK_ENTRY.B12;
  p.set(`${base}_year`, String(d.getFullYear()));
  p.set(`${base}_month`, String(d.getMonth() + 1));
  p.set(`${base}_day`, String(d.getDate()));
  p.set(`${base}_hour`, String(d.getHours()));
  p.set(`${base}_minute`, String(d.getMinutes()));
}

export function buildFeedbackUrl(ctx: FeedbackContext): string {
  const p = new URLSearchParams();
  p.set(FEEDBACK_ENTRY.A1, ctx.intent);

  // 純功能建議走的是另一個區段，[B1]/[B12] 那些題根本不會出現，填了也只是髒網址。
  if (ctx.intent !== INTENT.idea) {
    if (ctx.screen) p.set(FEEDBACK_ENTRY.B1, ctx.screen);
    if (ctx.occurredAt) appendOccurredAt(p, ctx.occurredAt);
    if (ctx.roomCode) p.set(FEEDBACK_ENTRY.B13, ctx.roomCode);
  }

  p.set(FEEDBACK_ENTRY.X1, APP_VERSION);

  // ⚠️ MUST NOT 把 teacherId／還原連結放進這個網址。
  //    還原連結是永久不可撤銷的 bearer token（005 NFR-017），
  //    放進外送 URL 等於寫進 Google 的伺服器日誌與瀏覽器歷史。
  return `${FORM_BASE}&${p.toString()}`;
}

/**
 * 開表單。
 *
 * 必須在使用者點擊的同一個任務裡**同步**呼叫——如果中間夾了 await，
 * 瀏覽器會把它當成非使用者觸發的彈出視窗而擋掉。這也是這裡整條路徑都不做
 * 非同步探測的原因之一。
 */
export function openFeedbackForm(ctx: FeedbackContext): void {
  window.open(buildFeedbackUrl(ctx), '_blank', 'noopener');
}
