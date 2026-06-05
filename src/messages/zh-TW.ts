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
    offlineHint: '離線模式 — 連線後自動同步',
    pendingSync: '待同步',
    error: '發生錯誤，請稍後再試',
    networkError: '網路錯誤，請稍後再試',
    confirm: '確認',
    cancel: '取消',
    back: '返回',
    retry: '重試',
    backHome: '回到首頁',
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
    rooms: '班級房間',
    settings: '設定',
  },

  // 首頁
  landing: {
    tagline: '讓收回條和登記作業變得更簡單',
    teacherTitle: '我是老師',
    teacherDesc: '建立班級房間、管理學生名單、查看繳交報表',
    teacherCta: '進入老師面板',
    helperTitle: '我是小老師',
    helperDesc: '掃描 QRCode 加入房間、幫忙登記繳交狀況',
    helperCta: '掃碼加入房間',
    featureFastTitle: '快速登記',
    featureFastDesc: '一鍵勾選即時更新',
    featureOfflineTitle: '離線支援',
    featureOfflineDesc: '無網路也能使用',
    featureReportTitle: '清晰報表',
    featureReportDesc: '一目了然的統計',
  },

  // QRCode 掃描與顯示
  qr: {
    enterTitle: '加入房間',
    enterHint: '掃描 QRCode 或輸入房間代碼',
    scanTitle: '掃描 QRCode',
    tapToOpenCamera: '點此開啟相機',
    scanInstruction: '點擊下方按鈕開啟相機掃描 QRCode',
    startScan: '開始掃描',
    stopScan: '停止掃描',
    cancelScan: '取消掃描',
    invalid: '無效的 QRCode，請掃描房間 QRCode',
    orManual: '或手動輸入',
    roomCode: '房間代碼',
    codePlaceholder: '例如：ABC123',
    emptyCode: '請輸入房間代碼',
    joinFailedRetry: '加入房間失敗，請確認代碼是否正確',
    generating: '產生 QRCode 中...',
    generateFailed: '無法產生 QRCode',
    copyCode: '複製代碼',
    copyUrl: '複製連結',
    codeCopied: '代碼已複製到剪貼簿',
    urlCopied: '連結已複製到剪貼簿',
    copyFailed: '複製失敗，請手動複製',
    instruction: '讓小老師用手機掃描此 QRCode，或輸入上方代碼即可加入房間',
    pageTitle: (room: string) => `QR Code — ${room}`,
    printQrcode: '列印 QRCode',
    backToRoom: '返回房間',
  },

  // 網路 / 同步狀態
  network: {
    online: '已連線',
    offlineSync: '離線模式 - 資料將在連線後同步',
  },
  sync: {
    syncing: '同步中...',
    pending: (n: number) => `${n} 筆待同步`,
    syncNow: '立即同步',
    synced: '已同步',
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
    joining: '正在加入房間...',
    joinFailedTitle: '無法加入房間',
    joinFailed: '加入房間失敗',
    reenterCode: '重新輸入代碼',
    joinSuccess: '成功加入房間！',
    roomName: '房間名稱',
    studentsCount: (n: number) => `${n} 位學生`,
    tasksCount: (n: number) => `${n} 個任務`,
    joinButton: '加入房間',
    // 後端會回給使用者看的錯誤
    roomNotFound: '找不到該房間，請確認代碼是否正確',
    roomInactive: '該房間已停用',
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
    selectSeatHint: '選擇你自己的座號，系統會記錄是誰做的登記',
    seatLabel: (seat: number) => `${seat} 號`,
    isAssigned: '你是本任務指定的小老師',
    notAssigned: '你不是本任務指定的小老師，仍可繼續登記',
    recordedAs: (seat: number) => `此次登記紀錄為：${seat} 號`,
  },

  task: {
    listTitle: '選擇要登記的任務',
    empty: '尚無任務',
    emptyHint: '請等待老師建立任務',
    assignedToYou: '指定給你',
    assignedToOther: (seat: number) => `指定給 ${seat} 號`,
    typeSubmission: '繳交',
    typeGrade: '成績',
    statusActive: '進行中',
    statusActiveOverdue: '進行中・逾期',
    statusHelperCompleted: '已標記完成',
    statusClosed: '已結案',
    dueLabel: (date: string) => `截止：${date}`,
    noDue: '無截止時間',
    startRecording: '開始登記',
    // 標記完成
    markComplete: '標記登記完畢',
    markCompleteWarning: '標記後你將無法自行修改，如需更動須請老師重新開放。',
    completedNote: '已標記登記完畢',
    // 兩種唯讀鎖定文案
    lockedCompleted: '此任務已完成，如需修改請告知老師重新開放',
    lockedDuePassed: '登記時間已過，如果要繼續登記請去找老師',
  },

  record: {
    rosterTitle: '學生名單',
    rosterEmpty: '尚未新增學生',
    statusHeader: '繳交狀況',
    listAria: '學生繳交狀況列表',
    seatAria: (n: number) => `座號 ${n}`,
    toggleAria: (name: string, submitted: boolean) =>
      `${name}，${submitted ? '已繳交' : '未繳交'}`,
    submittedCount: (n: number) => `${n} 已繳`,
    notSubmittedCount: (n: number) => `${n} 未繳`,
    progress: (percent: number) => `完成度 ${percent}%`,
    gradePlaceholder: '分數',
    numberOnly: '這裡只能填數字',
    gradeRange: '成績必須在 0-100 之間',
    saveFailed: '儲存失敗，請稍後再試',
  },

  room: {
    notFoundTitle: '找不到該房間',
    rejoin: '重新加入',
    leave: '離開房間',
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
    manageRooms: '管理您的班級房間',
    createRoom: '建立房間',
    noRoomsTitle: '還沒有房間',
    noRoomsDesc: '建立您的第一個班級房間，開始使用小老師助手',
    createFirstRoom: '建立第一個房間',
    createTeacherTitle: '建立老師帳號',
    createTeacherHint: '請輸入您的名字以開始使用',
    teacherNamePlaceholder: '例如：王老師',
    start: '開始使用',
    backToDashboard: '返回儀表板',

    // 房間詳情
    active: '啟用中',
    inactive: '已停用',
    showQrcode: '顯示 QRCode',
    tabStudents: '學生',
    tabTasks: '任務',
    tabReport: '報表',
    roomInfo: '房間資訊',
    roomCodeLabel: '房間代碼',
    studentCountLabel: '學生人數',
    taskCountLabel: '任務數',
    addStudent: '新增學生',
    seatPlaceholder: '座號',
    studentNamePlaceholder: '學生姓名',
    add: '新增',
    studentRoster: '學生名單',
    selectTask: '選擇任務',

    // 建立房間
    newRoomTitle: '建立新房間',
    className: '班級名稱',
    classNamePlaceholder: '例如：三年二班',
    rosterOptional: '學生名單（選填）',
    rosterHint: '每行一位學生，可加上座號，例如：',
    rosterExample: '1 王小明',
    rosterPlaceholder: '1 王小明\n2 李小華\n3 張小強',
    emptyClassName: '請輸入班級名稱',
    createRoomFailed: '建立房間失敗，請稍後再試',

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
  },
} as const;

export default messages;
