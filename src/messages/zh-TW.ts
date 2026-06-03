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
