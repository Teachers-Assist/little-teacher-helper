/**
 * 小老師助手 —— 意見回饋表單自動建置腳本（Google Apps Script）
 * 此 script 已非表單的最新狀態，以線上實際表單為準
 * ============================================================
 *
 * 為什麼用 Apps Script 而不是 Google Forms REST API：
 *   1. 不需要設定 OAuth client、不需要 service account、不需要處理 token
 *   2. FormApp 的 createChoice(value, pageBreakItem) 直接支援分流跳頁
 *   3. 建完之後可以在同一支腳本裡把 entry ID 撈出來（見 logEntryIds）
 *
 * 使用方式：
 *   1. 開 https://script.google.com → 新增專案
 *   2. 把這整份貼進 Code.gs，存檔
 *   3. 執行 buildFeedbackForm()（第一次會要求授權，按「進階」→「前往...(不安全)」）
 *   4. 看「執行記錄」拿到編輯網址與填答網址
 *   5. 把記錄裡的 FORM_ID 填到下方常數，執行 logEntryIds() 拿 entry ID
 *
 * ⚠️ 已知限制（Google 平台限制，不是腳本問題）：
 *   - **檔案上傳題無法用程式建立。** Forms REST API 文件明寫「The API currently does not
 *     support creating file upload questions」，Apps Script 的 Form 類別也沒有
 *     addFileUploadItem()。[B14] 螢幕截圖 必須建完後手動加，或改用 email 替代方案。
 *   - 「限選 3 項」的複選上限，CheckboxItem 沒有 setMaxChoices，只能靠題目文字提示
 *     （或改用 setValidation 的自訂驗證，但那需要手動在 UI 設）。
 */

// 執行 logEntryIds() 前填入（buildFeedbackForm 會在記錄中印出）
const FORM_ID = '';

// ============================================================
// 選項常數
// ============================================================
// ⚠️ 這些字串必須與 App 端組預填連結時用的字串**一字不差**，否則預填會失效。
//    建議把同一份常數複製到 src/lib/feedbackOptions.ts。
//    分隔符用**全形直線 ｜**，不要用半形 | 或逗號（複選題答案在 Sheet 是逗號分隔）。

const OPT = {
  role: ['teacher｜老師', 'helper｜小老師（學生）', 'other｜其他'],

  intent: [
    'bug｜回報問題（有東西怪怪的、壞掉了）',
    'idea｜功能建議（我希望它可以⋯）',
    'both｜兩個都有',
  ],

  screen: [
    'teacher-dashboard｜老師首頁（儀表板）',
    'teacher-room-students｜班級－學生名單',
    'teacher-room-tasks｜班級－任務清單',
    'teacher-room-status｜班級－班級狀況',
    'teacher-task-detail｜任務細節／結果頁',
    'teacher-qrcode｜QRCode 分享視窗',
    'teacher-import｜Excel 匯入學生',
    'teacher-restore｜還原連結／換裝置',
    'join-scan｜小老師掃碼進班',
    'join-seat｜選座號／自我聲明',
    'helper-task-list｜小老師任務清單',
    'helper-record｜小老師登記畫面',
    'other｜其他',
    'unknown｜不確定／想不起來',
  ],

  device: [
    'teacher-pc｜老師的電腦',
    'teacher-mobile｜老師的平板或手機',
    'student-tablet｜學生用的平板',
    'student-phone｜學生的手機',
    'unknown｜不確定',
  ],

  who: ['self｜我自己遇到的', 'student-told｜學生告訴我的', 'observed｜我在旁邊看到學生遇到'],

  network: ['online｜正常', 'unstable｜不太穩', 'offline｜完全沒網路', 'unknown｜不確定'],

  syncState: [
    'synced｜顯示「已同步」',
    'pending｜顯示「待上傳」',
    'syncing｜顯示「同步中」',
    'failed｜顯示「同步失敗」',
    'not-noticed｜沒注意看',
    'none｜那個畫面上沒有這個',
  ],

  frequency: ['once｜只發生過一次', 'sometimes｜偶爾會', 'always｜每次都這樣', 'unknown｜不確定'],

  severity: [
    'blocked｜完全卡住 那件事做不成',
    'workaround｜有點麻煩 但我找到別的方法完成了',
    'cosmetic｜只是看起來怪怪的 不影響使用',
    'data-loss｜我的資料好像不見了或跑掉了',
  ],

  ideaArea: ['teacher｜老師端', 'helper｜小老師（學生）端', 'parent｜家長', 'overall｜整體或其他'],

  ideaImpact: [
    'no-impact｜沒差 只是想到就講一下',
    'annoying｜有點麻煩 但我還是會繼續用',
    'blocker｜這會讓我不太想用這個系統',
  ],

  // ⚠️ 複選題：選項文字內**不可有半形逗號**（Sheet 用逗號串接多選答案）
  candidates: [
    'self-report｜學生自己標記「我交了」再跟小老師的登記互相對照',
    'public-board｜班級公開看板 讓全班同學都看得到誰交了',
    'parent-view｜家長可以看到自己孩子的繳交狀況',
    'parent-notify｜系統自動通知還沒交的學生家長',
    'teacher-push｜有異常才推播通知老師 平常不打擾',
    'grade-stats｜成績統計與圖表',
    'school-sync｜跟學校校務行政系統串接',
    'none｜以上都不特別想要',
  ],

  tenure: [
    'not-yet｜還沒真的用過 只是看過或聽說',
    'under-1w｜1 週以內',
    '1-4w｜1 到 4 週',
    'over-1m｜1 個月以上',
  ],

  interview: ['yes｜願意', 'maybe｜看時間', 'no｜不用了'],
};

// ============================================================
// 主流程
// ============================================================

function buildFeedbackForm() {
  const form = FormApp.create('小老師助手 — 意見回饋');

  form
    .setDescription(
      '謝謝你願意花時間告訴我們。\n\n' +
        '這份表單可以用來回報問題，也可以提功能建議。' +
        '一次請只講一件事，如果你有好幾件事，麻煩重複填幾次（這樣我們才好一件一件處理）。\n\n' +
        '填寫大約需要 3 分鐘。我們不會公開你的任何個人資訊。'
    )
    // ⚠️ 以下三項刻意都關掉，理由是「免帳號即用」的產品哲學：
    //    收集 email、限制一人一份，都會強迫填答者登入 Google 帳號。
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false) // 也讓同一人可以回報多件事（一列一事件）
    .setAllowResponseEdits(false)
    .setProgressBar(true)
    .setShowLinkToRespondAgain(true); // 填完可以直接再填一份，方便回報第二件事

  // ---------- Section 1：所有人 ----------

  const a1 = form.addMultipleChoiceItem();
  a1.setTitle('[A1] 你的身分')
    .setChoiceValues(OPT.role)
    .setRequired(true);

  // A2 是分流題。選項要指向後面才會建立的 pageBreak，所以先建題、稍後再 setChoices。
  const a2 = form.addMultipleChoiceItem();
  a2.setTitle('[A2] 你想告訴我們什麼').setRequired(true);

  // ---------- Section 2：回報問題 ----------

  const pbBug = form.addPageBreakItem().setTitle('回報問題');
  pbBug.setHelpText('請盡量照實填，記不清楚的地方留白也沒關係。');

  form
    .addListItem()
    .setTitle('[B1] 出問題的畫面')
    .setHelpText('選最接近的那一個。不確定就選「不確定／想不起來」。')
    .setChoiceValues(OPT.screen)
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('[B2] 出問題的裝置')
    .setChoiceValues(OPT.device)
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('[B3] 這是誰遇到的')
    .setHelpText('這會影響我們判斷資訊的完整度，請照實選。')
    .setChoiceValues(OPT.who)
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('[B4] 當時的網路狀況')
    .setChoiceValues(OPT.network);

  form
    .addMultipleChoiceItem()
    .setTitle('[B5] 畫面上當時的同步狀態')
    .setHelpText('小老師的登記畫面上會有一行狀態文字。如果你不確定就選「沒注意看」，沒關係。')
    .setChoiceValues(OPT.syncState);

  form
    .addTextItem()
    .setTitle('[B6] 你本來想做什麼')
    .setHelpText('一句話就好。例如：想把小明的座號從 8 號改成 15 號')
    .setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle('[B7] 你按了哪些地方 照順序寫')
    .setHelpText(
      '例如：\n' +
        '1. 點「五年三班」\n' +
        '2. 點「學生名單」\n' +
        '3. 點小明右邊的鉛筆圖示\n' +
        '4. 把座號改成 15，按儲存\n\n' +
        '記不清楚也沒關係，寫得出來的部分就好。'
    )
    .setRequired(true);

  form
    .addTextItem()
    .setTitle('[B8] 你以為會發生什麼')
    .setHelpText('例如：以為名單上小明會變成 15 號');

  form
    .addParagraphTextItem()
    .setTitle('[B9] 實際上發生了什麼')
    .setHelpText('例如：畫面轉圈圈很久，然後跳回去，小明還是 8 號。如果有錯誤訊息，麻煩照抄一遍。')
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('[B10] 發生的頻率')
    .setChoiceValues(OPT.frequency);

  form
    .addMultipleChoiceItem()
    .setTitle('[B11] 嚴重程度')
    .setChoiceValues(OPT.severity)
    .setRequired(true);

  form
    .addDateTimeItem()
    .setTitle('[B12] 大約發生時間')
    .setHelpText('知道大概的日期和時間就好，這樣我們才能對到系統紀錄。');

  form
    .addTextItem()
    .setTitle('[B13] 班級代碼')
    .setHelpText(
      '就是 QRCode 旁邊的那 6 個字。填了我們才能去查那個班級當下的紀錄，會查得比較準。' +
        '這個代碼只會用在調查這個問題上，不想填也沒關係。'
    );

  // ⚠️ [B14] 螢幕截圖（檔案上傳）無法用程式建立，見檔案開頭的限制說明。
  //    這裡改放一則說明題，提供 email 替代方案；若你要真的檔案上傳題，
  //    請建完後手動插在這個位置。
  form
    .addSectionHeaderItem()
    .setTitle('[B14] 螢幕截圖（可略過）')
    .setHelpText(
      '如果方便的話，把截圖寄到 <請填入你的 email>，信件標題寫上班級代碼就好。\n' +
        '（表單內建的檔案上傳需要登入 Google 帳號，所以我們沒有放在這裡。）'
    );

  form.addParagraphTextItem().setTitle('[B15] 還有什麼想補充的');

  // App 內預填連結會自動帶入這一題，填答者不需要動它
  form
    .addTextItem()
    .setTitle('[X1] 系統版本')
    .setHelpText('這一欄會自動填入，請不要修改。手動填表的話請留空。');

  // ---------- Section 3：功能建議 ----------

  const pbIdea = form.addPageBreakItem().setTitle('功能建議');
  pbIdea.setHelpText(
    '如果你剛才是來回報問題的，這一段可以整段留白直接往下捲。有建議的話很歡迎填。'
  );

  form.addMultipleChoiceItem().setTitle('[S1] 這個建議是關於').setChoiceValues(OPT.ideaArea);

  form
    .addParagraphTextItem()
    .setTitle('[S2] 你希望它可以做到什麼')
    .setHelpText('例如：希望可以一次把好幾個任務的截止日都往後延');

  form
    .addParagraphTextItem()
    .setTitle('[S3] 現在沒有這個功能的時候 你都怎麼處理')
    .setHelpText('例如：現在我都是一個一個點進去改，或是乾脆不設截止日');

  form
    .addMultipleChoiceItem()
    .setTitle('[S4] 如果一直沒有這個功能')
    .setChoiceValues(OPT.ideaImpact);

  form
    .addCheckboxItem()
    .setTitle('[S5] 以下這些我們正在考慮的功能 你最想要哪些')
    .setHelpText('請最多選 3 項，選你真的最想要的。')
    .setChoiceValues(OPT.candidates);

  form
    .addScaleItem()
    .setTitle('[S6] 你覺得這個功能有多重要')
    .setBounds(1, 5)
    .setLabels('有也不錯', '沒有這個我很困擾');

  // ---------- Section 4：所有人 ----------

  form.addPageBreakItem().setTitle('最後兩個問題');

  form
    .addMultipleChoiceItem()
    .setTitle('[Z1] 你使用這個系統多久了')
    .setChoiceValues(OPT.tenure)
    .setRequired(true);

  form
    .addTextItem()
    .setTitle('[Z2] Email')
    .setHelpText(
      '如果你願意讓我們針對這件事再問你幾個問題，或是之後想聽聽你更完整的使用心得，' +
        '留個 email 給我們。我們不會拿它做任何其他用途，也不會寄廣告。'
    );

  form
    .addMultipleChoiceItem()
    .setTitle('[Z3] 願意接受一次 20 分鐘的線上訪談嗎')
    .setChoiceValues(OPT.interview);

  // ---------- 分流：現在 pageBreak 都存在了，回頭設 A2 的選項 ----------
  // bug  → 跳到「回報問題」
  // idea → 跳到「功能建議」
  // both → 跳到「回報問題」，填完自然往下走到「功能建議」
  a2.setChoices([
    a2.createChoice(OPT.intent[0], pbBug),
    a2.createChoice(OPT.intent[1], pbIdea),
    a2.createChoice(OPT.intent[2], pbBug),
  ]);

  // ---------- 回應目的地（Sheet）----------
  const ss = SpreadsheetApp.create('小老師助手 — 意見回饋（回應）');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('======================================');
  Logger.log('FORM_ID      : %s', form.getId());
  Logger.log('編輯網址      : %s', form.getEditUrl());
  Logger.log('填答網址      : %s', form.getPublishedUrl());
  Logger.log('短網址        : %s', form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('回應 Sheet    : %s', ss.getUrl());
  Logger.log('======================================');
  Logger.log('下一步：把上面的 FORM_ID 填進腳本頂端的常數，然後執行 logEntryIds()');
}

// ============================================================
// 撈出 entry ID（App 內預填連結需要）
// ============================================================
/**
 * 做法：對每一題單獨建一個「只填這一題」的 FormResponse，呼叫 toPrefilledUrl()，
 * 從網址裡把 entry.NNNNN 抓出來。一次一題，某一題失敗不會拖垮其他題。
 *
 * 注意：createResponse 只是在記憶體裡建物件，不會真的送出一筆回應到 Sheet。
 */
function logEntryIds() {
  if (!FORM_ID) {
    throw new Error('請先把 buildFeedbackForm() 印出的 FORM_ID 填到腳本頂端的常數');
  }
  const form = FormApp.openById(FORM_ID);
  const out = [];

  form.getItems().forEach((item) => {
    const title = item.getTitle();
    const type = item.getType();
    let itemResponse = null;

    try {
      switch (type) {
        case FormApp.ItemType.TEXT:
          itemResponse = item.asTextItem().createResponse('x');
          break;
        case FormApp.ItemType.PARAGRAPH_TEXT:
          itemResponse = item.asParagraphTextItem().createResponse('x');
          break;
        case FormApp.ItemType.MULTIPLE_CHOICE:
          itemResponse = item
            .asMultipleChoiceItem()
            .createResponse(item.asMultipleChoiceItem().getChoices()[0].getValue());
          break;
        case FormApp.ItemType.LIST:
          itemResponse = item
            .asListItem()
            .createResponse(item.asListItem().getChoices()[0].getValue());
          break;
        case FormApp.ItemType.CHECKBOX:
          itemResponse = item
            .asCheckboxItem()
            .createResponse([item.asCheckboxItem().getChoices()[0].getValue()]);
          break;
        case FormApp.ItemType.SCALE:
          itemResponse = item.asScaleItem().createResponse(item.asScaleItem().getLowerBound());
          break;
        case FormApp.ItemType.DATE:
          itemResponse = item.asDateItem().createResponse(new Date());
          break;
        case FormApp.ItemType.DATETIME:
          itemResponse = item.asDateTimeItem().createResponse(new Date());
          break;
        default:
          // PAGE_BREAK / SECTION_HEADER / IMAGE 等非題目項目沒有 entry ID
          return;
      }

      const url = form.createResponse().withItemResponse(itemResponse).toPrefilledUrl();
      const m = url.match(/entry\.(\d+)/);
      out.push({ title: title, entry: m ? 'entry.' + m[1] : '(抓不到)' });
    } catch (e) {
      out.push({ title: title, entry: '(失敗：' + e.message + ')' });
    }
  });

  Logger.log('===== entry ID 對照表 =====');
  out.forEach((r) => Logger.log('%s\t%s', r.entry, r.title));

  // 直接印出可以貼進 src/lib/feedbackOptions.ts 的片段
  Logger.log('\n===== 貼進 App 的片段（記得自己對一下對應關係）=====');
  Logger.log('export const FEEDBACK_ENTRY = {');
  out.forEach((r) => {
    const code = (r.title.match(/^\[([A-Z0-9]+)\]/) || [])[1];
    if (code) Logger.log("  %s: '%s',", code, r.entry);
  });
  Logger.log('} as const;');
}
