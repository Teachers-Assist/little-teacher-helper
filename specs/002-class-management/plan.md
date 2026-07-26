# Plan: 002 班級管理體驗強化

**Input**: `specs/002-class-management/spec.md`、`tasks.md`
**狀態**: 實作中（batch 1 完成 US1/2/3/5；batch 2 進行 US4/6/7/8）

本檔記錄 spec 指定「寫入 plan.md」的具體實作參數與技術決策。

---

## 異常偵測閾值（FR-035 / T128）

> **此表已移交 `specs/anomaly-rules.md`（跨 feature 常青文件）維護，不再於此獨立維護。**
> 異常規則會跨 feature 演化（002 建立、004 重整），單一真實來源集中於 anomaly-rules.md。
> 以下保留 002 當時的原始版本作為歷史紀錄，**現行規則以 anomaly-rules.md 為準**。

**⚠️ 已被 004 重整（2026-07-20）取代**——規則一改滑動視窗、移除指定座號前置條件、新增登滿排除；規則二改絕對時鐘（截止日 08:00）；截止預設 23:59:59 → 17:00。現行定義見 `specs/anomaly-rules.md`。

實作於 `src/lib/anomalyDetection.ts`（純函式，US4 monitoring 與 US8 dashboard 共用）。

| 異常類型（002 原始版，已過時） | 觸發條件 | 閾值 |
|---|---|---|
| `ASSIGNED_SEAT_IDLE`（指定座號無登記） | 任務 `status=ACTIVE` 且未封存，有指定座號，且尚無「指定小老師」的登記，自任務建立起已超過閾值 | **24 小時** |
| `NO_RECORDS_NEAR_DUE`（接近截止且零登記） | 任務 `status=ACTIVE` 且未封存，有截止時間，尚未過截止，距截止小於閾值，且完全無登記 | **6 小時** |

- 已封存（`isArchived`）或非 `ACTIVE`（已結案 / 小老師已完成）的任務**不判異常**。
- 「裝置長時間未同步」在 002 階段**未實作**；004 以任務層級活動（滑動視窗）作為代理指標解決，不需裝置心跳。見 `specs/anomaly-rules.md` 規則一與 `specs/open-questions.md`。

---

## 技術決策

- **Excel 匯入**：xlsx(SheetJS) 官方 CDN 修補版 `0.20.3`；**前端解析**、後端只收乾淨 JSON（避開 Cloudflare Workers 相容性與 npm 版 CVE）。範本為靜態檔 `public/templates/students-template.xlsx`。
- **Prisma**：專案無 migrations 目錄，使用 `prisma db push`（sqlite `dev.db`）。
- **任務封存 / 還原**：以 `PATCH { isArchived }` 同時涵蓋封存與還原（未另建 `/restore` route）。
- **班級詳情頁捲動**：app-shell 結構（`.sidebar-layout` 固定視窗高），桌機（lg+）班級資訊 + tabs 釘住、僅列表內部捲動（`.room-detail-body`）；小螢幕整頁於 `.page-body` 內捲。
- **US5 偏差**：小老師端登記頁使用 `RecordForm` 而非 `StudentList`，故只建 `StudentRoster` 並刪除 `StudentList`，未建 dead-code 的 `StudentChecklist`（待 spec-align 修 FR-038）。

---

## 路由結構變更（002）

- 廢除 `/teacher/tasks/[roomId]`（任務列表頁）→ 改由任務 tab 取代
- `/teacher/tasks/[roomId]/[taskId]` → 單一任務「結果頁」（US6）
- 廢除 `/teacher/rooms/[id]/qrcode` → 改為 `/teacher/rooms/[id]` 內的 QRCode modal（US7）
- `/teacher`（dashboard）→ 簡易統計 + 雙視角 tab（US8）
