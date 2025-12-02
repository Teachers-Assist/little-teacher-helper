interface Student {
  id: string;
  name: string;
  seatNumber?: number | null;
}

interface ReportData {
  itemName: string;
  submittedStudents: Student[];
  notSubmittedStudents: Student[];
  submissionRate: number;
}

/**
 * 產生純文字報表
 */
export function generateTextReport(data: ReportData): string {
  const lines: string[] = [];
  
  lines.push(`【${data.itemName}】繳交狀況`);
  lines.push('');
  lines.push(`已繳交：${data.submittedStudents.length}人`);
  lines.push(`未繳交：${data.notSubmittedStudents.length}人`);
  lines.push(`繳交率：${data.submissionRate}%`);
  lines.push('');
  
  if (data.notSubmittedStudents.length > 0) {
    lines.push('未繳交名單：');
    data.notSubmittedStudents.forEach((student, index) => {
      const seatStr = student.seatNumber ? `${student.seatNumber}號 ` : '';
      lines.push(`${index + 1}. ${seatStr}${student.name}`);
    });
  } else {
    lines.push('✅ 全班已繳交完成！');
  }

  return lines.join('\n');
}

/**
 * 複製文字到剪貼簿
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    
    // Fallback for older browsers
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

/**
 * 產生 HTML 報表並開啟列印
 */
export function printReport(data: ReportData): void {
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>${data.itemName} - 繳交報表</title>
  <style>
    body {
      font-family: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      font-size: 24px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .summary {
      display: flex;
      gap: 20px;
      margin: 20px 0;
    }
    .summary-item {
      background: #f5f5f5;
      padding: 15px 20px;
      border-radius: 8px;
    }
    .summary-item .value {
      font-size: 32px;
      font-weight: bold;
    }
    .summary-item .label {
      color: #666;
    }
    .submitted { color: #22c55e; }
    .not-submitted { color: #ef4444; }
    h2 {
      margin-top: 30px;
      font-size: 18px;
    }
    ul {
      padding-left: 20px;
    }
    li {
      padding: 5px 0;
    }
    .footer {
      margin-top: 40px;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>📋 ${data.itemName}</h1>
  
  <div class="summary">
    <div class="summary-item">
      <div class="value submitted">${data.submittedStudents.length}</div>
      <div class="label">已繳交</div>
    </div>
    <div class="summary-item">
      <div class="value not-submitted">${data.notSubmittedStudents.length}</div>
      <div class="label">未繳交</div>
    </div>
    <div class="summary-item">
      <div class="value">${data.submissionRate}%</div>
      <div class="label">繳交率</div>
    </div>
  </div>
  
  ${data.notSubmittedStudents.length > 0 ? `
  <h2>❌ 未繳交名單 (${data.notSubmittedStudents.length}人)</h2>
  <ul>
    ${data.notSubmittedStudents.map((s) => 
      `<li>${s.seatNumber ? `${s.seatNumber}號 ` : ''}${s.name}</li>`
    ).join('')}
  </ul>
  ` : '<p>✅ 全班已繳交完成！</p>'}
  
  ${data.submittedStudents.length > 0 ? `
  <h2>✓ 已繳交名單 (${data.submittedStudents.length}人)</h2>
  <ul>
    ${data.submittedStudents.map((s) => 
      `<li>${s.seatNumber ? `${s.seatNumber}號 ` : ''}${s.name}</li>`
    ).join('')}
  </ul>
  ` : ''}
  
  <div class="footer">
    產生時間：${new Date().toLocaleString('zh-TW')}
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `.trim();

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

