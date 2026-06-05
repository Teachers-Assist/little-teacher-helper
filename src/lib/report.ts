import { messages } from '@/messages/zh-TW';

export interface ReportRow {
  seatNumber: number;
  name: string;
  result: string; // 顯示結果：已繳/未繳，或 分數/未登記
  done: boolean; // 是否已登記（繳交＝已繳；成績＝有分數）
}

export interface ReportData {
  taskName: string;
  className: string;
  type: 'SUBMISSION' | 'GRADE';
  generatedAt: string; // 已格式化的產生時間
  total: number;
  recorded: number;
  rows: ReportRow[]; // 全班，依座號排序
}

const m = messages.report;

/**
 * 純文字報表（FR-010）：含任務名稱、日期、未完成登記名單。
 * 適合貼到通訊軟體。
 */
export function generateTextReport(data: ReportData): string {
  const lines: string[] = [];
  lines.push(`【${data.taskName}】${data.className}`);
  lines.push(data.generatedAt);
  lines.push(m.recorded(data.recorded, data.total));
  lines.push('');

  const incomplete = data.rows.filter((r) => !r.done);
  if (incomplete.length === 0) {
    lines.push(m.allDone);
  } else {
    lines.push(`${m.incompleteList}（${incomplete.length} ${m.unitPerson}）：`);
    incomplete.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.seatNumber}${m.colSeat} ${r.name}`);
    });
  }

  return lines.join('\n');
}

/** 複製文字到剪貼簿（含舊瀏覽器 fallback）。 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );
}

/**
 * 可列印報表（FR-009）：用瀏覽器原生列印（window.print）。
 * 內容含任務名稱、班級名稱、日期、已登記/總人數、每位學生姓名與結果。
 */
export function printReport(data: ReportData): void {
  const rowsHtml = data.rows
    .map(
      (r) => `<tr class="${r.done ? '' : 'undone'}">
        <td class="seat">${r.seatNumber}</td>
        <td>${escapeHtml(r.name)}</td>
        <td class="result">${escapeHtml(r.result)}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(m.printTitle(data.taskName))}</title>
  <style>
    body { font-family: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #111; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 16px; }
    .meta strong { color: #111; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
    th { background: #f3f4f6; }
    td.seat, td.result { text-align: center; white-space: nowrap; }
    tr.undone td { color: #b91c1c; }
    .footer { margin-top: 20px; font-size: 12px; color: #777; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.taskName)}</h1>
  <div class="meta">
    <div><strong>${escapeHtml(data.className)}</strong></div>
    <div>${escapeHtml(data.generatedAt)}</div>
    <div>${escapeHtml(m.recorded(data.recorded, data.total))}</div>
  </div>
  <table>
    <thead>
      <tr><th>${m.colSeat}</th><th>${m.colName}</th><th>${m.colResult}</th></tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
