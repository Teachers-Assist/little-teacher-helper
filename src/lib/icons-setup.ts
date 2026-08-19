/**
 * Icon registry setup — import this file to pre-register the Lucide icons used in this app.
 * Runs synchronously at module load time (no CDN fetch, no delays).
 *
 * HOW TO ADD A NEW ICON:
 *   1. Add the icon name to USED_ICONS below
 *   2. Use <Icon name="icon-name" /> anywhere in the app
 *
 * 為什麼「有列在 USED_ICONS」很重要：
 * `@iconify/react` 找不到本地註冊的名字時**不會留白，而是即時去 api.iconify.design 抓**。
 * 畫面看起來正常，代價卻是三件事：
 *   1. 離線就消失——跨網域請求必失敗，而離線可用正是本專案的賣點（且有 service worker）
 *   2. 每次載入都告訴第三方這台裝置正在看哪些圖示（等於哪個畫面），還多一次阻塞的往返
 *   3. 完全靜默——漏列名字不會報錯，只會悄悄變成一個網路請求
 *
 * 因此下面的組裝流程遇到查不到的名字，會在 **dev** 直接 throw（開發當下就看得到），
 * 正式環境則只 console.error 並維持原本的降級行為。
 *
 * 為什麼正式環境刻意不 throw：這支模組的組裝迴圈跑在 **module 載入時**，而 `Icon`
 * 元件在檔頭 import 它、全專案有 31 個檔案又 import `Icon`。加上所有頁面都是動態路由
 * （`next build` 輸出全是 ƒ、不會 prerender），throw 擋不到 build——實測在 USED_ICONS
 * 塞一個不存在的名字，`next build` 仍然 exit 0。它只會在上線後第一個請求才爆，
 * 而且是所有實際頁面同時爆（見下方註解）。那比「圖示改從 CDN 抓」嚴重太多。
 *
 * 想確認有沒有漏註冊：開瀏覽器 devtools 跑
 *   performance.getEntriesByType('resource').filter(r => !r.name.includes(location.host))
 * 逛過各頁面後這個陣列應該是空的；出現 api.iconify.design 就代表有名字沒列進來。
 *
 * The full @iconify-json/lucide package is imported once here; bundlers will
 * include the whole icons.json (~400 KB gzipped) in the bundle. If bundle size
 * becomes critical, switch to individual SVG strings defined inline.
 */

import { addCollection } from '@iconify/react';
import lucideData from '@iconify-json/lucide/icons.json';

type RawIcon = { body: string; width?: number; height?: number };
/** lucide 改名後留下的舊名指向新名；可能還帶旋轉／翻轉，所以整包原樣保留。 */
type RawAlias = { parent: string; rotate?: number; hFlip?: boolean; vFlip?: boolean };

// Explicitly list every icon used in the project — keeps intent clear.
const USED_ICONS = [
  'layout-dashboard',
  'school',
  'users',
  'user',
  'clipboard-list',
  'qr-code',
  'settings',
  'plus',
  'arrow-left',
  'x',
  'book-open',
  'camera',
  'printer',
  'pencil',
  'bar-chart-2',
  'wifi-off',
  'check-circle-2',
  'alert-circle',
  'search',
  'frown',
  'graduation-cap',
  'hand',
  'pen-line',
  'refresh-cw',
  'bell-ring',
  'info',
  'ellipsis-vertical',
  'archive',
  'calendar-clock',
  'rotate-ccw',
  'party-popper',
  'star',
  'copy',
  'table',
  'play-circle',
  'play',
  'alert-triangle',
  'external-link',
  'chevron-right',
  'lightbulb',
  'message-square-warning', // 回報問題（FeedbackMenuItem / 首頁回饋連結）

  // 以下這些一直都有在用，只是漏了註冊，所以先前每次載入都是去 CDN 抓的。
  'activity',
  'check-check',
  'chevron-down',
  'chevron-up',
  'clock',
  'cloud-off',
  'download',
  'layout-grid',
  'link',
  'link-2-off',
  'list',
  'lock',
  'maximize',
  'menu',
  'package',
  'trash-2',
  'upload',
] as const;

const data = lucideData as unknown as {
  icons: Record<string, RawIcon>;
  aliases?: Record<string, RawAlias>;
};

const icons: Record<string, RawIcon> = {};
const aliases: Record<string, RawAlias> = {};

/**
 * 把一個名字收進 subset。
 *
 * 名字可能是本體，也可能是 lucide 改名後留下的舊名（alias，例如 play-circle → circle-play）。
 * alias 必須連同它指向的本體一起收，否則 addCollection 解不開，仍會退回去打 CDN。
 * parent 也可能還是 alias，所以要遞迴；trail 用來擋住理論上的循環參照。
 */
function include(name: string, trail: readonly string[] = []): void {
  if (data.icons[name]) {
    icons[name] = data.icons[name];
    return;
  }

  const alias = data.aliases?.[name];
  if (alias) {
    if (trail.includes(name)) {
      throw new Error(`icons-setup: alias 循環參照：${[...trail, name].join(' → ')}`);
    }
    aliases[name] = alias;
    include(alias.parent, [...trail, name]);
    return;
  }

  // dev 直接炸出來；正式環境只是少註冊一個名字（退回 CDN），不拖垮所有頁面。
  //
  // 在正式環境 throw 的後果：這行跑在 module 載入時，不是在某個 render 裡，
  // 所以錯誤會發生在「載入 Icon 這個模組」的當下，任何用到 Icon 的頁面都還沒開始 render
  // 就先失敗；而 module 一旦評估失敗就會被標記，後續 import 直接重拋，不會自己好。
  // 首頁、老師端、小老師端全部中鏢（唯一倖存的是 error/not-found 那幾頁——它們沒有 import Icon，
  // 所以使用者看到的會是「出錯了」而不是白畫面，但 App 本身等於全滅）。
  const message =
    `icons-setup: 「${name}」在 @iconify-json/lucide 裡不存在（本體與 alias 都查不到）。` +
    `留著它不會留白，而是每次載入都去 api.iconify.design 抓，離線就消失。` +
    `請到 https://icones.js.org/collection/lucide 查正確名稱後修正 USED_ICONS 與呼叫端。`;
  if (process.env.NODE_ENV !== 'production') throw new Error(message);
  console.error(message);
}

for (const name of USED_ICONS) include(name);

addCollection({
  prefix: 'lucide',
  icons,
  aliases,
  width: 24,
  height: 24,
});
