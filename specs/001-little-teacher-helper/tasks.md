# Tasks: 小老師助手系統 (Little Teacher Helper)

**Input**: Design documents from `/specs/001-little-teacher-helper/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested - test tasks not included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js 14+ project with TypeScript and App Router in repository root
- [x] T002 [P] Configure pnpm as package manager with pnpm-lock.yaml
- [x] T003 [P] Setup Tailwind CSS configuration in tailwind.config.ts and src/styles/globals.css
- [x] T004 [P] Configure ESLint and Prettier with TypeScript strict mode in .eslintrc.json
- [x] T005 [P] Create .env.example with DATABASE_URL and NEXT_PUBLIC_APP_URL variables
- [x] T006 [P] Setup Prisma ORM with SQLite provider in prisma/schema.prisma
- [x] T007 Create project directory structure per plan.md (src/app, src/components, src/lib, src/hooks, src/types)
- [x] T008 [P] Create PWA manifest.json in public/manifest.json with app metadata and icons

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Define complete Prisma schema with all entities (Teacher, Room, Student, Item, Submission) in prisma/schema.prisma
- [x] T010 Run Prisma migration to create database schema
- [x] T011 [P] Implement Prisma client singleton in src/lib/db.ts
- [x] T012 [P] Create shared TypeScript types in src/types/index.ts based on data-model.md
- [x] T013 [P] Create base UI components (Button, Card, Checkbox, StatusBadge) in src/components/ui/
- [x] T014 [P] Create root layout with PWA meta tags in src/app/layout.tsx
- [x] T015 [P] Create utility functions (generateRoomCode, formatDate) in src/lib/utils.ts
- [x] T016 [P] Setup next-pwa configuration in next.config.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 老師建立班級房間 (Priority: P1) 🎯 MVP

**Goal**: 老師可以建立班級房間、產生 QRCode、設定學生名單

**Independent Test**: 老師成功建立房間並顯示 QRCode，可手動輸入學生名單

### Implementation for User Story 1

- [x] T017 [P] [US1] Implement POST /api/teachers endpoint in src/app/api/teachers/route.ts
- [x] T018 [P] [US1] Implement GET /api/teachers/[id] endpoint in src/app/api/teachers/[id]/route.ts
- [x] T019 [P] [US1] Implement QRCode generation utility in src/lib/qrcode.ts using qrcode package
- [x] T020 [US1] Implement GET, POST /api/rooms endpoints in src/app/api/rooms/route.ts
- [x] T021 [US1] Implement GET, PATCH, DELETE /api/rooms/[id] endpoints in src/app/api/rooms/[id]/route.ts
- [x] T022 [US1] Implement GET, POST /api/rooms/[roomId]/students endpoints in src/app/api/rooms/[id]/students/route.ts
- [x] T023 [US1] Implement POST /api/rooms/[roomId]/students/batch endpoint in src/app/api/rooms/[id]/students/batch/route.ts
- [x] T024 [P] [US1] Create QRCodeDisplay component in src/components/QRCodeDisplay.tsx
- [x] T025 [P] [US1] Create StudentList component in src/components/StudentList.tsx
- [x] T026 [US1] Create homepage/entry point in src/app/page.tsx with teacher/helper role selection
- [x] T027 [US1] Create teacher dashboard page in src/app/teacher/page.tsx
- [x] T028 [US1] Create room list page in src/app/teacher/rooms/page.tsx
- [x] T029 [US1] Create new room page with form in src/app/teacher/rooms/new/page.tsx
- [x] T030 [US1] Create room detail page in src/app/teacher/rooms/[id]/page.tsx
- [x] T031 [US1] Create QRCode display page in src/app/teacher/rooms/[id]/qrcode/page.tsx
- [x] T032 [US1] Implement useRoom hook for room data management in src/hooks/useRoom.ts

**Checkpoint**: User Story 1 complete - Teacher can create rooms, add students, and generate QRCode

---

## Phase 4: User Story 2 - 小老師加入房間並登記回條 (Priority: P1) 🎯 MVP

**Goal**: 小老師掃描 QRCode 加入房間，查看學生名單並登記繳交狀態

**Independent Test**: 小老師可掃碼加入房間，勾選學生繳交狀態，資料儲存成功

### Implementation for User Story 2

- [x] T033 [P] [US2] Implement GET /api/rooms/join/[code] endpoint in src/app/api/rooms/join/[code]/route.ts
- [x] T034 [US2] Implement GET, PATCH /api/submissions endpoints in src/app/api/submissions/route.ts
- [x] T035 [US2] Implement GET /api/items/[itemId]/submissions endpoint in src/app/api/items/[id]/submissions/route.ts
- [x] T036 [P] [US2] Create QRScanner component using html5-qrcode in src/components/QRScanner.tsx
- [x] T037 [P] [US2] Create SubmissionForm component in src/components/SubmissionForm.tsx
- [x] T038 [US2] Create join room page (QRCode destination) in src/app/join/[code]/page.tsx
- [x] T039 [US2] Create helper main page (select item) in src/app/helper/[roomId]/page.tsx
- [x] T040 [US2] Create submission recording page in src/app/helper/[roomId]/[itemId]/page.tsx
- [x] T041 [US2] Implement localStorage wrapper for offline data in src/lib/offline/storage.ts
- [x] T042 [US2] Implement offline operation queue in src/lib/offline/queue.ts

**Checkpoint**: User Story 2 complete - Helper can scan QRCode, join room, and record submissions

---

## Phase 5: User Story 3 - 老師查看繳交報表 (Priority: P2)

**Goal**: 老師可以查看各項目的繳交狀況報表，並匯出為列印或文字格式

**Independent Test**: 老師可查看報表，看到已繳交/未繳交人數及名單，可複製純文字格式

### Implementation for User Story 3

- [x] T043 [US3] Implement GET /api/items/[itemId]/report endpoint in src/app/api/items/[id]/report/route.ts
- [x] T044 [P] [US3] Create ReportView component in src/components/ReportView.tsx
- [x] T045 [US3] Integrate report view into room detail page in src/app/teacher/rooms/[id]/page.tsx
- [x] T046 [US3] Implement report export functions (text, print) in src/lib/report.ts
- [x] T047 [US3] Add print-friendly CSS styles in src/styles/print.css

**Checkpoint**: User Story 3 complete - Teacher can view and export submission reports

---

## Phase 6: User Story 4 - 離線模式支援 (Priority: P2)

**Goal**: 小老師在無網路時可繼續登記，恢復連線後自動同步

**Independent Test**: 在離線狀態下完成登記，恢復網路後資料成功同步到伺服器

### Implementation for User Story 4

- [x] T048 [US4] Implement POST /api/sync endpoint in src/app/api/sync/route.ts
- [x] T049 [P] [US4] Create NetworkStatus component in src/components/NetworkStatus.tsx
- [x] T050 [P] [US4] Create SyncIndicator component in src/components/SyncIndicator.tsx
- [ ] T051 [US4] Implement offline sync logic in src/lib/offline/sync.ts
- [x] T052 [US4] Implement useNetworkStatus hook in src/hooks/useNetworkStatus.ts
- [x] T053 [US4] Implement useOfflineSync hook in src/hooks/useOfflineSync.ts
- [ ] T054 [US4] Integrate offline/online status display in helper pages
- [ ] T055 [US4] Configure Service Worker caching strategies in next.config.js

**Checkpoint**: User Story 4 complete - App works offline with automatic sync on reconnection

---

## Phase 7: User Story 5 - 建立多個登記項目 (Priority: P3)

**Goal**: 老師可以建立多個登記項目，小老師可選擇要登記哪個項目

**Independent Test**: 老師建立多個項目，小老師可選擇項目並分別登記

### Implementation for User Story 5

- [x] T056 [US5] Implement GET, POST /api/rooms/[roomId]/items endpoints in src/app/api/rooms/[id]/items/route.ts
- [x] T057 [US5] Implement GET, PATCH, DELETE /api/items/[id] endpoints in src/app/api/items/[id]/route.ts
- [ ] T058 [P] [US5] Create ItemList component for displaying items in src/components/ItemList.tsx
- [ ] T059 [US5] Create item management page in src/app/teacher/items/[roomId]/page.tsx
- [x] T060 [US5] Update helper main page to show item selection in src/app/helper/[roomId]/page.tsx
- [x] T061 [US5] Add item statistics to room detail page in src/app/teacher/rooms/[id]/page.tsx

**Checkpoint**: User Story 5 complete - Multiple items can be created and tracked independently

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T062 [P] Add loading states and skeleton UI across all pages
- [ ] T063 [P] Implement error boundaries and error pages (404, 500) in src/app/
- [ ] T064 [P] Add toast notifications for user feedback using React Hot Toast
- [ ] T065 Optimize touch interactions for tablet devices (44x44px touch targets)
- [ ] T066 Add accessibility attributes (ARIA labels, focus management)
- [ ] T067 [P] Create PWA icons set in public/icons/ (192x192, 512x512)
- [ ] T068 Performance optimization: implement React.memo and useMemo where beneficial
- [ ] T069 Run quickstart.md validation to ensure development setup works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel after Foundational
  - US3-US5 can start after Foundational but some tasks depend on previous stories' components
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Uses Room from US1 but can mock initially
- **User Story 3 (P2)**: Depends on US1 (Room) and US2 (Submissions exist) for meaningful testing
- **User Story 4 (P2)**: Depends on US2 (offline storage structure) - enhances existing functionality
- **User Story 5 (P3)**: Can start after Foundational - extends US1 Room management

### Within Each User Story

- API endpoints before UI pages
- Components before pages that use them
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# Parallel: T002, T003, T004, T005, T006, T008
```

**Phase 2 (Foundational)**:
```bash
# After T009-T010: T011, T012, T013, T014, T015, T016 can run in parallel
```

**Phase 3 (US1)**:
```bash
# Parallel: T017, T018, T019
# Parallel: T024, T025
```

**Phase 4 (US2)**:
```bash
# Parallel: T033 with T036, T037
```

**Phase 6 (US4)**:
```bash
# Parallel: T049, T050
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Teacher creates room
4. Complete Phase 4: User Story 2 - Helper records submissions
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy/demo if ready - THIS IS YOUR MVP!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo (Teacher side)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP!)
4. Add User Story 3 → Test independently → Deploy (Reports)
5. Add User Story 4 → Test independently → Deploy (Offline)
6. Add User Story 5 → Test independently → Deploy (Multi-item)
7. Each story adds value without breaking previous stories

### Suggested MVP Scope

**Minimum Viable Product = US1 + US2**:
- 老師可建立房間、設定學生名單、產生 QRCode ✅
- 小老師可掃碼加入、登記繳交狀態 ✅
- 資料儲存在伺服器 ✅

This delivers core value: **老師下課時間不再被登記工作佔用**

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

### Constitution Compliance

Before marking any task complete, verify:
- **MVP-First**: Is this the minimum needed to deliver value?
- **Occam's Razor**: Is there a simpler solution?
- **KISS**: Can a new team member understand this in 10 minutes?
- **TS Ecosystem**: Does this use TypeScript consistently? (No plain .js files)
- **User-Centric**: Does this benefit the teacher/helper workflow?

### Key Technology References

| Technology | Package | Usage |
|------------|---------|-------|
| Framework | next@14+ | App Router, API Routes |
| ORM | prisma | Database operations |
| PWA | next-pwa | Service Worker, offline |
| QR Generate | qrcode | Create QR codes |
| QR Scan | html5-qrcode | Camera-based scanning |
| Styling | tailwindcss | Utility-first CSS |

