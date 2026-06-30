// 所有對使用者顯示的文字集中於此（NFR-001）。
// 元件內不得直接硬寫中文字串；新增文字時先在此加 key 再於元件引用。
// 文字需隨目標年齡層語氣調整，未來也可能多語系，集中管理才能快速全局調整。

export const messages = {
  common: {
    loading: '載入中...',
    saving: '儲存中...',
    syncing: '同步中...',
    saved: '已儲存',
    savedOffline: '已暫存',
    synced: '已同步',
    offline: '離線模式',
    offlineHint: '沒有網路 — 資料暫存在本機，連上網路後自動上傳',
    pendingSync: '待同步',
    error: '發生錯誤，請稍後再試',
    networkError: '網路連不上。別擔心，你的資料安全存在本機 — 連上網路後再試試',
    confirm: '確認',
    cancel: '取消',
    back: '返回',
    retry: '重試',
    backHome: '回到首頁',
    edit: (name: string) => `編輯 ${name}`,
    remove: (name: string) => `移除 ${name}`,
  },

  // App metadata（瀏覽器分頁、PWA）
  app: {
    name: '小老師助手',
    description: '讓小老師幫忙收回條和登記作業繳交狀況的 PWA 應用程式',
  },

  // 側欄導覽
  nav: {
    appName: '小老師助手',
    sectionGeneral: '一般',
    dashboard: '儀表板',
    rooms: '班級', // DEPRECATED（002 US8）：偽按鈕，待程式移除
    settings: '設定',
    language: '語言',
    // 002 US8：新增「我的班級」可展開清單
    myClasses: '我的班級',
    expandClasses: '展開班級清單',
    noClassYet: '還沒建立班級喔',
    tasks: '任務列表',
  },

  // 首頁
  landing: {
    tagline: '讓收回條和登記作業變得更簡單',
    teacherTitle: '我是老師',
    teacherDesc: '建立班級、管理學生名單、查看繳交報表',
    teacherCta: '進入老師面板',
    helperTitle: '我是小老師',
    helperDesc: '用相機掃描老師的 QRCode，進入班級幫忙記錄誰有繳交',
    helperCta: '掃描 QRCode 加入班級',
    featureFastTitle: '快速登記',
    featureFastDesc: '一鍵勾選即時更新',
    featureOfflineTitle: '離線支援',
    featureOfflineDesc: '無網路也能使用',
    featureReportTitle: '清晰報表',
    featureReportDesc: '一目了然的統計',
  },

  // QRCode 掃描與顯示
  qr: {
    enterTitle: '加入班級',
    enterHint: '掃描 QRCode 或輸入班級代碼',
    scanTitle: '掃描 QRCode',
    tapToOpenCamera: '點此開啟相機',
    scanInstruction: '點擊下方按鈕開啟相機掃描 QRCode',
    startScan: '開始掃描',
    stopScan: '停止掃描',
    cancelScan: '取消掃描',
    invalid: '這個 QRCode 不對，請掃描老師給你的班級 QRCode', // DEPRECATED：由 codeNotOurs 取代（003 US1）
    // 003 US1：兒童語氣錯誤訊息
    codeNotOurs: '這個 QR Code 好像不是老師給的喔，再試一次吧',
    permissionDenied: '你沒允許我看到相機，去找老師幫你打開吧。你也可以在下面直接打班級代碼',
    cameraUnsupported: '這台裝置的相機不能用喔，下面直接打字也可以',
    failureUpgrade: '試了好幾次都沒成功，去找老師看看吧',
    noNetwork: '現在沒有網路喔，先去找一個有 WiFi 的地方再試試',
    orManual: '或手動輸入',
    roomCode: '班級代碼',
    codePlaceholder: '例如：ABC123',
    emptyCode: '還沒輸入班級代碼喔',
    joinFailedRetry: '加入班級失敗了，代碼有輸入對嗎？請再確認一次',
    generating: '產生 QRCode 中...',
    generateFailed: '無法產生 QRCode',
    copyCode: '複製代碼',
    copyUrl: '複製連結',
    codeCopied: '代碼已複製到剪貼簿',
    urlCopied: '連結已複製到剪貼簿',
    copyFailed: '複製失敗，請手動複製',
    instruction: '讓小老師用手機掃描此 QRCode，或輸入上方代碼即可加入班級',
  },

  // 網路 / 同步狀態
  network: {
    online: '已連上網路',
    offlineSync: '現在沒有網路 — 你登記的資料先存在平板裡，連上網路後會自動上傳',
  },
  sync: {
    syncing: '正在上傳資料，老師就快看得到了...',
    pending: (n: number) => `有 ${n} 筆資料還沒上傳，等待連上網路`,
    syncNow: '現在上傳',
    synced: '上傳完成！老師現在看得到你的登記了',
  },
  toast: {
    close: '關閉通知',
  },

  // 錯誤 / 找不到頁面
  errorPage: {
    notFoundTitle: '找不到頁面',
    notFoundDesc: '您要找的頁面可能已被移除、名稱已更改，或暫時無法使用。',
    teacherEntry: '老師入口',
    helperEntry: '小老師入口',
    errorTitle: '出錯了',
    errorHeading: '發生了一些問題',
    errorDesc: '很抱歉，應用程式遇到了一些問題。請嘗試重新載入頁面，或稍後再試。',
    globalTitle: '嚴重錯誤',
    globalHeading: '應用程式發生嚴重問題',
    globalDesc: '很抱歉，發生了無法恢復的錯誤。請重新載入頁面或聯繫技術支援。',
  },

  join: {
    joining: '正在進入班級...',
    joinFailedTitle: '進不了這個班級',
    joinFailed: '進入失敗',
    reenterCode: '重新輸入代碼',
    joinSuccess: '進來了！歡迎加入班級！',
    roomName: '班級名稱',
    studentsCount: (n: number) => `${n} 位學生`,
    tasksCount: (n: number) => `${n} 個任務`,
    joinButton: '加入班級',
    // 後端會回給使用者看的錯誤（003 US1 改為兒童語氣）
    roomNotFound: '找不到這個班級耶 🔍 是不是少打了一個字？或是大小寫不一樣？',
    roomInactive: '這個班級老師暫時關起來了，問問老師怎麼回事吧',
    // 003 US2：自我聲明印章
    identityStamp: (seat: number, name: string) => `我是 ${seat} 號 ${name}`,
  },

  // 學生相關的後端錯誤（會在老師端顯示給使用者）
  student: {
    nameRequired: '學生姓名為必填欄位',
    nameTooLong: '學生姓名長度不可超過 50 字元',
    seatRequired: '座號為必填，且必須在 1-99 之間',
    seatDuplicate: '此座號在班級中已存在',
    seatDuplicateInList: '名單中有重複的座號',
    seatDuplicateExisting: '有座號與班級中現有學生重複',
    createFailed: '新增學生失敗',
    batchEmpty: '請提供學生名單',
    batchTooMany: '一次最多新增 50 位學生',
    batchFailed: '批次新增學生失敗',
  },

  // 小老師身分（座號選擇與指派提示）
  identity: {
    selectSeatTitle: '請選擇你的座號',
    selectSeatHint: '選你自己的座號，系統會記錄是「你」做了這次登記',
    seatLabel: (seat: number) => `${seat} 號`,
    isAssigned: '這次就是指定你！來吧，開始登記！',
    notAssigned: '這個任務不是指定給你的，不過你還是可以繼續登記。有問題記得去找老師',
    recordedAs: (seat: number) => `這次的登記記錄為：${seat} 號`,
  },

  task: {
    listTitle: '選擇要登記的任務',
    empty: '現在還沒有任務',
    emptyHint: '等老師建立任務之後，你就可以開始登記了！',
    assignedToYou: '指定給你',
    assignedToOther: (seat: number) => `指定給 ${seat} 號`,
    typeSubmission: '繳交',
    typeGrade: '成績',
    statusActive: '進行中',
    statusActiveOverdue: '進行中・已超過截止時間',
    statusHelperCompleted: '已標記完成',
    statusClosed: '老師已關閉',
    dueLabel: (date: string) => `截止：${date}`,
    noDue: '沒有截止時間',
    startRecording: '開始登記',
    // 標記完成
    markComplete: '我登記完了',
    markCompleteWarning: '標記之後你就不能自己修改了。如果需要更改，要請老師重新開放。',
    completedNote: '已標記：登記完畢',
    // 兩種唯讀鎖定文案
    lockedCompleted: '你已經標記完畢了！如果需要修改，告訴老師幫你重新開放就好',
    lockedDuePassed:
      '截止時間到了，這個任務鎖起來了，沒辦法再改。資料都有截止時間 — 時間一到就會自動鎖定。如果還需要繼續登記，去找老師吧！',
  },

  record: {
    rosterTitle: '學生名單',
    rosterEmpty: '名單裡還沒有學生',
    statusHeader: '繳交狀況',
    listAria: '學生繳交狀況列表',
    seatAria: (n: number) => `座號 ${n}`,
    toggleAria: (name: string, submitted: boolean) => `${name}，${submitted ? '已繳交' : '未繳交'}`,
    submittedCount: (n: number) => `${n} 已繳`,
    notSubmittedCount: (n: number) => `${n} 未繳`,
    progress: (percent: number) => `完成度 ${percent}%`,
    gradePlaceholder: '分數',
    numberOnly: '這裡只能填數字',
    gradeRange: '成績必須在 0-100 之間',
    saveFailed: '沒存到！可能是網路斷掉了。別擔心，你的資料還在 — 連上網路後再試試看！',
    // 003 US3：登記者 badge（常駐顯示）
    recorderLabel: '登記者：',
    assignedHint: '你是老師指定的登記者！',
    notAssignedHint: '你不是被指定的小老師>_<',
  },

  room: {
    notFoundTitle: '找不到這個班級',
    rejoin: '重新進入',
    leave: '離開班級',
    // 003 US4：換座號彈窗
    changeSeatTitle: '想換座號嗎？',
    changeSeatMessage: '需要重新進入班級喔',
    changeSeatConfirm: '重新進入',
  },

  // 報表
  report: {
    loading: '載入報表中...',
    loadFailed: '無法載入報表',
    copyText: '複製文字',
    print: '列印',
    copied: '已複製到剪貼簿',
    copyFailed: '複製失敗',
    recorded: (done: number, total: number) => `已登記 ${done}/${total}`,
    submitted: '已繳交',
    notSubmitted: '未繳交',
    submissionRate: '繳交率',
    allSubmitted: '全班已繳交完成！',
    grade: '成績',
    notRecorded: '未登記',
    // 列印 / 純文字用
    resultSubmitted: '已繳',
    resultNotSubmitted: '未繳',
    unitPerson: '人',
    incompleteList: '未完成登記名單',
    allDone: '全部完成！',
    colSeat: '座號',
    colName: '姓名',
    colResult: '結果',
    generatedAt: (t: string) => `產生時間：${t}`,
    printTitle: (task: string) => `${task} - 登記報表`,
  },

  // 老師端
  teacher: {
    studentsUnit: (n: number) => `${n} 位學生`,
    tasksUnit: (n: number) => `${n} 個任務`,

    // 帳號 / 儀表板
    welcome: (name: string) => `歡迎回來，${name}`,
    manageRooms: '管理您的班級',
    createRoom: '建立班級',
    noRoomsTitle: '還沒有班級',
    noRoomsDesc: '建立您的第一個班級，開始使用小老師助手',
    createFirstRoom: '建立第一個班級',
    createTeacherTitle: '建立老師帳號',
    createTeacherHint: '請輸入您的名字以開始使用',
    teacherNamePlaceholder: '例如：王老師',
    start: '開始使用',
    backToDashboard: '返回儀表板',

    // 班級詳情
    active: '啟用中',
    inactive: '已停用',
    showQrcode: '顯示 QRCode',
    tabStudents: '學生',
    tabTasks: '任務',
    tabReport: '報表',
    roomInfo: '班級資訊',
    roomCodeLabel: '班級代碼',
    studentCountLabel: '學生人數',
    taskCountLabel: '任務數',
    addStudent: '新增學生',
    seatPlaceholder: '座號',
    studentNamePlaceholder: '學生姓名',
    add: '新增',
    studentRoster: '學生名單',
    selectTask: '選擇任務',

    // 建立班級
    newRoomTitle: '建立新班級',
    className: '班級名稱',
    classNamePlaceholder: '例如：三年二班',
    rosterOptional: '學生名單（選填）',
    rosterHint: '每行一位學生，可加上座號，例如：',
    rosterExample: '1 王小明',
    rosterPlaceholder: '1 王小明\n2 李小華\n3 張小強',
    emptyClassName: '請輸入班級名稱',
    createRoomFailed: '建立班級失敗，請稍後再試',

    // 任務管理
    taskMgmtTitle: '任務管理',
    backTo: (name: string) => `返回 ${name}`,
    newTask: '新增任務',
    taskName: '任務名稱',
    taskNamePlaceholder: '例如：數學作業',
    taskType: '任務類型',
    assignSeat: '指定小老師（選填）',
    assignNone: '不指定',
    due: '截止時間（選填）',
    createTask: '新增任務',
    taskListTitle: '任務列表',
    noTasks: '尚無任務',
    noTasksHint: '建立任務後，小老師就可以開始登記',
    recorded: (done: number, total: number) => `已登記 ${done}/${total}`,
    assignedSeatLabel: (seat: number) => `指定 ${seat} 號`,
    manageTask: '管理任務',

    // 狀態操作
    reopen: '重新開放',
    close: '結案',
    delete: '刪除',
    reopenTitle: '重新開放任務',
    reopenConfirm: '重新開放後小老師可繼續修改登記內容。',
    closeTitle: '結案任務',
    closeConfirm: '結案後此任務將不再開放登記。',
    deleteTitle: '刪除任務',
    deleteConfirm: '刪除後該任務的所有登記記錄都會一併移除，且無法復原。',

    // ─── 002 新增：任務表單（inline 模式切換）─────────────────
    taskForm: {
      editing: (name: string) => `正在編輯：${name}`,
      cancelEdit: '取消編輯',
      dueDatePastError: '截止日不能為過去',
      dueDateExpiredHint: (date: string) => `原截止日 ${date} 已過，請重設或留空`,
    },

    // ─── 002 新增：任務列項操作 / 徽章 ─────────────────────────
    taskList: {
      edit: '編輯',
      archive: '封存',
      archivedDrawer: '已封存任務',
      archiveConfirmTitle: '封存任務',
      archiveConfirmMessage: (name: string) =>
        `確定要封存「${name}」嗎？歷史登記記錄會保留，可在「已封存任務」還原。`,
      extendDue: '延長截止',
      badgeInProgress: '進行中',
      badgeDueExpired: '已截止',
      badgeHelperCompleted: '小老師已標記完成',
      badgeClosed: '已結案',
    },

    // ─── 002 新增：學生管理 ───────────────────────────────────
    studentList: {
      removed: '已移除',
      removedSuffix: '（已移除）',
      removedDrawer: '已移除學生',
      removedEmpty: '目前沒有已移除的學生',
      restore: '還原',
      import: '上傳 Excel',
      importTemplate: '下載範本',
      importTitle: '批次匯入學生',
      importHint: '下載範本填好座號與姓名後上傳，一次匯入整班。',
      importing: '解析中...',
      importSuccess: (count: number) => `成功匯入 ${count} 位學生`,
      importConflict: '匯入有衝突，請修正後重試',
      importConflictTitle: '無法匯入，請修正以下問題後再上傳：',
      removeConfirmTitle: '移除學生',
      removeConfirmMessage: (name: string) =>
        `確定要移除「${name}」嗎？歷史登記記錄會保留，可在「已移除學生」還原。`,
      importErrors: {
        rowLabel: (n: number) => `第 ${n} 列`,
        fileEmpty: '檔案是空的，找不到任何資料',
        fileParseFailed: '無法讀取檔案，請確認是有效的 .xlsx 檔',
        missingColumnSeat: '找不到「座號」欄位',
        missingColumnName: '找不到「姓名」欄位',
        noRows: '檔案裡沒有任何學生資料',
        tooMany: '一次最多匯入 100 位學生',
        seatNotNumber: '座號必須是數字',
        seatOutOfRange: '座號必須在 1-99 之間',
        nameRequired: '姓名不能空白',
        nameTooLong: '姓名不可超過 50 字',
        seatDupInFile: '座號與檔案中其他列重複',
        nameDupInFile: '姓名與檔案中其他列重複',
        seatDupExisting: '座號與班級現有學生重複',
        nameDupExisting: '姓名與班級現有學生重複',
      },
    },

    // ─── 002 新增：班級狀況 tab（取代原報表 tab）──────────────
    classStatus: {
      tab: '班級狀況',
      empty: '目前沒有需要注意的事',
      alertsTitle: '需要注意',
      statTotal: '總任務數',
      statInProgress: '進行中',
      statAnomalies: '有異常',
      statArchived: '已封存',
      anomalyAssignedSeatIdle: (seat: number) => `指定座號 ${seat} 已超過 24 小時沒有登記`,
      anomalyNoRecordsNearDue: '即將截止，但還沒有任何登記',
    },

    // ─── 002 新增：任務細節頁 ─────────────────────────────────
    taskDetail: {
      unrecorded: '未登記',
      registrationList: '登記明細',
      unrecordedList: '未登記學生',
      recordedBy: (seat: number) => `登記者 ${seat} 號`,
      noRecordsYet: '還沒有任何登記',
      allRecorded: '全班都登記了！',
      infoType: '類型',
      infoAssigned: '指定小老師',
      infoDue: '截止時間',
      infoStatus: '狀態',
      infoArchived: '已封存',
      noDue: '無截止時間',
      notAssigned: '未指定',
      assignedRemoved: (seat: number) => `指定座號 ${seat}（學生已移除）`,
    },

    // ─── 002 新增：QRCode modal ───────────────────────────────
    qrcode: {
      showButton: '顯示 QRCode',
      fullscreen: '進入全螢幕',
      copySuccess: '已複製到剪貼簿',
      copyFailed: '複製失敗，請手動選取',
    },

    // ─── 002 新增：Dashboard 雙視角 ───────────────────────────
    dashboard: {
      byClass: '按班級檢視',
      byTask: '按任務檢視',
      searchPlaceholder: '🔍 搜尋任務名稱',
      noInProgressTasks: '還沒有進行中的任務喔',
      createFirstClass: '來建立第一個班級吧',
      statRoomCount: '班級數',
      statInProgressTasks: '進行中任務',
      statAnomalies: '異常',
      inProgressUnit: (n: number) => `${n} 個進行中`,
      recordedRatio: (done: number, total: number) => `已登記 ${done}/${total}`,
      lastActivityMinutesAgo: (n: number) => `${n} 分鐘前`,
      lastActivityHoursAgo: (n: number) => `${n} 小時前`,
      lastActivityToday: '剛剛',
      lastActivityYesterday: '昨天',
    },
  },
} as const;

export default messages;
