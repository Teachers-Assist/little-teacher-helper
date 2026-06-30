// All user-facing strings are centralized here (NFR-001).
// Do not hardcode strings inside components; add a key here first, then reference it.
// Tone must match the target audience — student-facing strings use language suitable for ages 7–10.

export const messages = {
  common: {
    loading: 'Loading...',
    saving: 'Saving...',
    syncing: 'Syncing...',
    saved: 'Saved',
    savedOffline: 'Saved offline',
    synced: 'Synced',
    offline: 'Offline',
    offlineHint: 'No internet — data saved on this device and will upload when reconnected',
    pendingSync: 'Pending upload',
    error: 'Something went wrong. Please try again.',
    networkError:
      "Can't connect to the internet. Your data is safe on this device — try again when you're back online.",
    confirm: 'Confirm',
    cancel: 'Cancel',
    back: 'Back',
    retry: 'Try Again',
    backHome: 'Back to Home',
    edit: (name: string) => `Edit ${name}`,
    remove: (name: string) => `Remove ${name}`,
  },

  // App metadata (browser tab, PWA)
  app: {
    name: 'Little Teacher Helper',
    description:
      'A PWA app that lets student helpers collect forms and record assignment submissions',
  },

  // Sidebar navigation
  nav: {
    appName: 'Little Teacher Helper',
    sectionGeneral: 'General',
    dashboard: 'Dashboard',
    rooms: 'Classes', // DEPRECATED (002 US8): dead button, pending code removal
    settings: 'Settings',
    language: 'Language',
    // 002 US8: new "My Classes" expandable list
    myClasses: 'My Classes',
    expandClasses: 'Expand class list',
    noClassYet: 'No classes yet',
    tasks: 'Tasks',
  },

  // Home page
  landing: {
    tagline: 'Making form collection and assignment tracking simple',
    teacherTitle: "I'm a Teacher",
    teacherDesc: 'Create classes, manage student lists, and view submission reports',
    teacherCta: 'Go to Teacher Panel',
    helperTitle: "I'm a Student Helper",
    helperDesc:
      "Scan your teacher's QR code to join your class and help record who's turned in their work",
    helperCta: 'Scan QR Code to Join',
    featureFastTitle: 'Fast Recording',
    featureFastDesc: 'One tap updates instantly',
    featureOfflineTitle: 'Works Offline',
    featureOfflineDesc: 'Use it even without internet',
    featureReportTitle: 'Clear Reports',
    featureReportDesc: 'Easy-to-read stats at a glance',
  },

  // QR code scanning and display
  qr: {
    // --- Student-facing (join flow) ---
    enterTitle: 'Join Your Class',
    enterHint: 'Scan a QR code or type in the class code',
    startScan: 'Start Scanning',
    // 003 US1: child-friendly error messages
    codeNotOurs: "That QR code doesn't look like one from your teacher. Try again?",
    permissionDenied:
      "You haven't allowed camera access yet. Ask your teacher for help — or just type the class code below.",
    cameraUnsupported:
      "The camera doesn't work on this device. You can type the code below instead.",
    failureUpgrade: 'Not working after a few tries. Time to ask your teacher.',
    noNetwork: 'No internet right now. Try again where you can find WiFi.',
    orManual: 'Or type it in',
    roomCode: 'Class Code',
    codePlaceholder: 'e.g. ABC123',
    emptyCode: "Oops! You haven't typed in a class code yet.",
    joinFailedRetry:
      "Couldn't join the class. Did you type the code right? Check it and try again!",
    // --- Teacher-facing (display / share) ---
    generating: 'Generating QR code...',
    generateFailed: 'Failed to generate QR code',
    copyCode: 'Copy Code',
    copyUrl: 'Copy Link',
    codeCopied: 'Code copied to clipboard',
    urlCopied: 'Link copied to clipboard',
    copyFailed: 'Copy failed. Please copy it manually.',
    instruction:
      'Have your student helper scan this QR code, or enter the code above to join the class.',
  },

  // Network / sync status — student-facing
  network: {
    online: "You're connected to the internet",
    offlineSync:
      "No internet right now — your records are saved on this device and will upload automatically when you're back online",
  },
  sync: {
    syncing: 'Uploading your records... your teacher will be able to see them soon!',
    pending: (n: number) => `${n} record${n === 1 ? '' : 's'} waiting to upload`,
    syncNow: 'Upload Now',
    synced: 'All uploaded! Your teacher can see your records now.',
  },
  toast: {
    close: 'Dismiss',
  },

  // Error / not found pages
  errorPage: {
    notFoundTitle: 'Page Not Found',
    notFoundDesc:
      'The page you were looking for may have been removed, renamed, or is temporarily unavailable.',
    teacherEntry: 'Teacher Portal',
    helperEntry: 'Student Helper Portal',
    errorTitle: 'Something Went Wrong',
    errorHeading: 'Something went wrong',
    errorDesc:
      'Sorry, the app ran into a problem. Please try reloading the page or come back later.',
    globalTitle: 'Critical Error',
    globalHeading: 'A critical error occurred',
    globalDesc:
      'Sorry, an unrecoverable error has occurred. Please reload the page or contact technical support.',
  },

  // Student-facing — joining a class
  join: {
    joining: 'Joining your class...',
    joinFailedTitle: "Can't get into this class",
    joinFailed: 'Failed to join',
    reenterCode: 'Enter Code Again',
    joinSuccess: "You're in! Welcome to the class!",
    roomName: 'Class Name',
    studentsCount: (n: number) => `${n} student${n === 1 ? '' : 's'}`,
    tasksCount: (n: number) => `${n} task${n === 1 ? '' : 's'}`,
    joinButton: 'Join Class',
    // Errors returned from the backend (003 US1: child-friendly tone)
    roomNotFound: "Can't find that class. Missing a letter? Wrong case?",
    // 003 US2: identity stamp
    identityStamp: (seat: number, name: string) => `I'm No. ${seat}, ${name}`,
  },

  // Backend validation errors — displayed in the teacher interface
  student: {
    nameRequired: 'Student name is required',
    nameTooLong: 'Student name cannot exceed 50 characters',
    seatRequired: 'Seat number is required and must be between 1 and 99',
    seatDuplicate: 'This seat number already exists in the class',
    seatDuplicateInList: 'There are duplicate seat numbers in the list',
    seatDuplicateExisting: 'Some seat numbers conflict with existing students in the class',
    createFailed: 'Failed to add student',
    batchEmpty: 'Please provide a student list',
    batchTooMany: 'You can add up to 50 students at a time',
    batchFailed: 'Failed to add students in bulk',
  },

  // Student-facing — identity / seat selection
  identity: {
    selectSeatTitle: 'Pick Your Seat Number',
    selectSeatHint: 'Choose YOUR seat number — the app will remember that YOU did this recording!',
    emptyRoster: "Your teacher hasn't set up the student list yet. Go ask your teacher!",
    seatLabel: (seat: number) => `Seat ${seat}`,
    isAssigned: "You're the one picked for this task — awesome, let's go!",
    notAssigned: "You weren't assigned to this task, but you can still go ahead and record it",
    recordedAs: (seat: number) => `This recording will be saved as: Seat ${seat}`,
  },

  // Student-facing — task list and task states
  task: {
    listTitle: 'Pick a task to record',
    empty: 'No tasks yet',
    emptyHint: 'Wait for your teacher to add a task — then you can start recording!',
    assignedToYou: 'Assigned to you',
    assignedToOther: (seat: number) => `Assigned to Seat ${seat}`,
    typeSubmission: 'Submission',
    typeGrade: 'Grade',
    statusActive: 'In Progress',
    statusActiveOverdue: 'In Progress · Past Due',
    statusHelperCompleted: 'Marked Complete',
    statusClosed: 'Closed by Teacher',
    dueLabel: (date: string) => `Due: ${date}`,
    noDue: 'No due date',
    startRecording: 'Start Recording',
    // Mark complete
    markComplete: "I'm done recording!",
    markCompleteWarning:
      "Once you mark this done, you won't be able to change it yourself. If you need to fix something, you'll have to ask your teacher to reopen it.",
    completedNote: 'Marked: Recording Complete',
    // Two read-only lock states
    lockedCompleted:
      'You already marked this done! If you need to make changes, ask your teacher to reopen it.',
    lockedDuePassed:
      "The due date has passed, so this task is now locked. Data has a deadline — once it's over, it can't be changed anymore. If you still need to record something, go find your teacher!",
  },

  // Student-facing — recording screen
  record: {
    rosterTitle: 'Student List',
    rosterEmpty: 'No students in the list yet',
    statusHeader: 'Submission Status',
    listAria: 'Student submission status list',
    seatAria: (n: number) => `Seat ${n}`,
    toggleAria: (name: string, submitted: boolean) =>
      `${name}, ${submitted ? 'submitted' : 'not submitted'}`,
    submittedCount: (n: number) => `${n} submitted`,
    notSubmittedCount: (n: number) => `${n} not in`,
    progress: (percent: number) => `${percent}% done`,
    gradePlaceholder: 'Score',
    numberOnly: 'Numbers only here!',
    gradeRange: 'Score must be between 0 and 100',
    saveFailed:
      "Couldn't save! The internet might have cut out. Don't worry — your data is still here. Try again when you're back online.",
    // 003 US3: recorder badge (always visible)
    recorderLabel: 'Recorded by: ',
    assignedHint: "You're the recorder for this task!",
    notAssignedHint: "You're not the assigned recorder >_<",
  },

  // Student-facing — room/class state
  room: {
    notFoundTitle: "Can't find this class",
    rejoin: 'Rejoin',
    leave: 'Leave Class',
    // 003 US4: change-seat dialog
    changeSeatTitle: 'Want to change seats?',
    changeSeatMessage: "You'll need to enter the class again",
    changeSeatConfirm: 'Re-enter',
  },

  // Teacher-facing — reports
  report: {
    loading: 'Loading report...',
    loadFailed: 'Failed to load report',
    copyText: 'Copy Text',
    print: 'Print',
    copied: 'Copied to clipboard',
    copyFailed: 'Copy failed',
    recorded: (done: number, total: number) => `Recorded ${done}/${total}`,
    submitted: 'Submitted',
    notSubmitted: 'Not Submitted',
    submissionRate: 'Submission Rate',
    allSubmitted: 'Everyone has submitted!',
    grade: 'Grade',
    notRecorded: 'Not recorded',
    // Used in print / plain-text export
    resultSubmitted: 'In',
    resultNotSubmitted: 'Missing',
    unitPerson: '',
    incompleteList: 'Incomplete Submissions',
    allDone: 'All done!',
    colSeat: 'Seat',
    colName: 'Name',
    colResult: 'Result',
    generatedAt: (t: string) => `Generated: ${t}`,
    printTitle: (task: string) => `${task} — Submission Report`,
  },

  // Teacher-facing — all teacher UI
  teacher: {
    studentsUnit: (n: number) => `${n} student${n === 1 ? '' : 's'}`,
    tasksUnit: (n: number) => `${n} task${n === 1 ? '' : 's'}`,

    // Account / dashboard
    welcome: (name: string) => `Welcome back, ${name}`,
    manageRooms: 'Manage your classes',
    createRoom: 'Create Class',
    noRoomsTitle: 'No classes yet',
    noRoomsDesc: 'Create your first class to start using Little Teacher Helper',
    createFirstRoom: 'Create First Class',
    createTeacherTitle: 'Set Up Teacher Account',
    createTeacherHint: 'Enter your name to get started',
    teacherNamePlaceholder: 'e.g. Ms. Wang',
    start: 'Get Started',
    backToDashboard: 'Back to Dashboard',

    // Class details
    showQrcode: 'Show QR Code',
    tabStudents: 'Students',
    tabTasks: 'Tasks',
    tabReport: 'Report',
    roomInfo: 'Class Info',
    roomCodeLabel: 'Class Code',
    studentCountLabel: 'Students',
    taskCountLabel: 'Tasks',
    addStudent: 'Add Student',
    seatPlaceholder: 'Seat #',
    studentNamePlaceholder: 'Student name',
    add: 'Add',
    studentRoster: 'Student Roster',
    selectTask: 'Select Task',

    // Create class
    newRoomTitle: 'Create New Class',
    className: 'Class Name',
    classNamePlaceholder: 'e.g. Grade 3 Class 2',
    rosterOptional: 'Student List (optional)',
    rosterHint: 'One student per line, with seat number. Example:',
    rosterExample: '1 Alice Wang',
    rosterPlaceholder: '1 Alice Wang\n2 Bob Lee\n3 Charlie Zhang',
    emptyClassName: 'Please enter a class name',
    createRoomFailed: 'Failed to create class. Please try again.',

    // Task management
    taskMgmtTitle: 'Task Management',
    backTo: (name: string) => `Back to ${name}`,
    newTask: 'New Task',
    taskName: 'Task Name',
    taskNamePlaceholder: 'e.g. Math Homework',
    taskType: 'Task Type',
    assignSeat: 'Assign Student Helper (optional)',
    assignNone: 'None',
    due: 'Due Date (optional)',
    createTask: 'Create Task',
    taskListTitle: 'Task List',
    noTasks: 'No tasks yet',
    noTasksHint: 'Once you create a task, student helpers can start recording',
    recorded: (done: number, total: number) => `Recorded ${done}/${total}`,
    assignedSeatLabel: (seat: number) => `Assigned to Seat ${seat}`,
    manageTask: 'Manage Task',

    // Status actions
    reopen: 'Reopen',
    close: 'Close',
    delete: 'Delete',
    reopenTitle: 'Reopen Task',
    reopenConfirm: 'Reopening will allow the student helper to continue editing the records.',
    closeTitle: 'Close Task',
    closeConfirm: 'Closing this task will stop all further recording.',
    deleteTitle: 'Delete Task',
    deleteConfirm:
      'Deleting this task will permanently remove all its records and cannot be undone.',

    // ─── 002 new: task form (inline mode switching) ────────────
    taskForm: {
      editing: (name: string) => `Editing: ${name}`,
      cancelEdit: 'Cancel Edit',
      dueDatePastError: 'Due date cannot be in the past',
      dueDateExpiredHint: (date: string) =>
        `Original due date ${date} has passed. Please reset or leave blank.`,
    },

    // ─── 002 new: task list actions / badges ───────────────────
    taskList: {
      edit: 'Edit',
      archive: 'Archive',
      archivedDrawer: 'Archived Tasks',
      archiveConfirmTitle: 'Archive Task',
      archiveConfirmMessage: (name: string) =>
        `Archive "${name}"? Past records are kept and you can restore from "Archived Tasks".`,
      extendDue: 'Extend Due Date',
      badgeInProgress: 'In Progress',
      badgeDueExpired: 'Past Due',
      badgeHelperCompleted: 'Marked Complete',
      badgeClosed: 'Closed',
    },

    // ─── 002 new: student management ───────────────────────────
    studentList: {
      removed: 'Removed',
      removedSuffix: ' (removed)',
      removedDrawer: 'Removed Students',
      removedEmpty: 'No removed students',
      restore: 'Restore',
      import: 'Upload Excel',
      importTemplate: 'Download Template',
      importTitle: 'Bulk Import Students',
      importHint:
        'Download the template, fill in seat numbers and names, then upload to import the whole class at once.',
      importing: 'Parsing...',
      importSuccess: (count: number) => `Imported ${count} student${count === 1 ? '' : 's'}`,
      importConflict: 'Import has conflicts. Please fix and retry.',
      importConflictTitle: 'Cannot import. Please fix the following and re-upload:',
      removeConfirmTitle: 'Remove Student',
      removeConfirmMessage: (name: string) =>
        `Remove "${name}"? Past records are kept and you can restore from "Removed Students".`,
      importErrors: {
        rowLabel: (n: number) => `Row ${n}`,
        fileEmpty: 'The file is empty — no data found',
        fileParseFailed: 'Could not read the file. Please make sure it is a valid .xlsx file.',
        missingColumnSeat: 'Column "座號" (Seat) not found',
        missingColumnName: 'Column "姓名" (Name) not found',
        noRows: 'No student rows found in the file',
        tooMany: 'Up to 100 students can be imported at once',
        seatNotNumber: 'Seat number must be a number',
        seatOutOfRange: 'Seat number must be between 1 and 99',
        nameRequired: 'Name cannot be blank',
        nameTooLong: 'Name cannot exceed 50 characters',
        seatDupInFile: 'Duplicate seat number within the file',
        nameDupInFile: 'Duplicate name within the file',
        seatDupExisting: 'Seat number already used by an existing student',
        nameDupExisting: 'Name already used by an existing student',
      },
    },

    // ─── 002 new: class status tab (replaces Report tab) ───────
    classStatus: {
      tab: 'Class Status',
      empty: 'Nothing to attend to right now',
      alertsTitle: 'Needs Attention',
      statTotal: 'Total Tasks',
      statInProgress: 'In Progress',
      statAnomalies: 'Anomalies',
      statArchived: 'Archived',
      anomalyAssignedSeatIdle: (seat: number) =>
        `Assigned seat ${seat} has not recorded for over 24 hours`,
      anomalyNoRecordsNearDue: 'Due soon, but no records yet',
    },

    // ─── 002 new: task detail page ─────────────────────────────
    taskDetail: {
      unrecorded: 'Not Recorded',
      registrationList: 'Registration Details',
      unrecordedList: 'Not Recorded',
      recordedBy: (seat: number) => `By seat ${seat}`,
      noRecordsYet: 'No records yet',
      allRecorded: 'Everyone has been recorded!',
      infoType: 'Type',
      infoAssigned: 'Assigned Helper',
      infoDue: 'Due',
      infoStatus: 'Status',
      infoArchived: 'Archived',
      noDue: 'No due date',
      notAssigned: 'Unassigned',
      assignedRemoved: (seat: number) => `Assigned seat ${seat} (student removed)`,
    },

    // ─── 002 new: QR code modal ────────────────────────────────
    qrcode: {
      showButton: 'Show QR Code',
      fullscreen: 'Enter Fullscreen',
      copySuccess: 'Copied to clipboard',
      copyFailed: 'Copy failed. Please select manually.',
    },

    // ─── 002 new: dashboard dual-view ──────────────────────────
    dashboard: {
      byClass: 'By Class',
      byTask: 'By Task',
      searchPlaceholder: '🔍 Search task name',
      noInProgressTasks: 'No tasks in progress yet',
      createFirstClass: 'Create your first class',
      statRoomCount: 'Classes',
      statInProgressTasks: 'In Progress',
      statAnomalies: 'Anomalies',
      inProgressUnit: (n: number) => `${n} in progress`,
      recordedRatio: (done: number, total: number) => `Recorded ${done}/${total}`,
      lastActivityMinutesAgo: (n: number) => `${n} min${n === 1 ? '' : 's'} ago`,
      lastActivityHoursAgo: (n: number) => `${n} hour${n === 1 ? '' : 's'} ago`,
      lastActivityToday: 'Just now',
      lastActivityYesterday: 'Yesterday',
    },
  },
} as const;

export default messages;
