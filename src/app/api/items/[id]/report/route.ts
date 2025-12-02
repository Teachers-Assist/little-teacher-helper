import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                seatNumber: true,
                isRemoved: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: '找不到該項目' },
        { status: 404 }
      );
    }

    // Filter out removed students
    const activeSubmissions = item.submissions.filter(
      (s) => !s.student.isRemoved
    );

    const submittedStudents = activeSubmissions
      .filter((s) => s.status === 'SUBMITTED')
      .map((s) => s.student)
      .sort((a, b) => (a.seatNumber || 99) - (b.seatNumber || 99));

    const notSubmittedStudents = activeSubmissions
      .filter((s) => s.status === 'NOT_SUBMITTED')
      .map((s) => s.student)
      .sort((a, b) => (a.seatNumber || 99) - (b.seatNumber || 99));

    const total = activeSubmissions.length;
    const submitted = submittedStudents.length;
    const notSubmitted = notSubmittedStudents.length;
    const submissionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;

    const report = {
      item: {
        id: item.id,
        name: item.name,
        dueDate: item.dueDate,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
      summary: {
        total,
        submitted,
        notSubmitted,
        submissionRate,
      },
      submittedStudents,
      notSubmittedStudents,
    };

    // Return based on format
    if (format === 'text') {
      const text = generateTextReport(report);
      return new NextResponse(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (format === 'print') {
      const html = generatePrintReport(report);
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      { error: '產生報表失敗' },
      { status: 500 }
    );
  }
}

interface ReportData {
  item: {
    id: string;
    name: string;
    dueDate: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  summary: {
    total: number;
    submitted: number;
    notSubmitted: number;
    submissionRate: number;
  };
  submittedStudents: Array<{ id: string; name: string; seatNumber: number | null }>;
  notSubmittedStudents: Array<{ id: string; name: string; seatNumber: number | null }>;
}

function generateTextReport(report: ReportData): string {
  const lines: string[] = [];
  
  lines.push(`【${report.item.name}】繳交狀況`);
  lines.push('');
  lines.push(`已繳交：${report.summary.submitted}人`);
  lines.push(`未繳交：${report.summary.notSubmitted}人`);
  lines.push(`繳交率：${report.summary.submissionRate}%`);
  lines.push('');
  
  if (report.notSubmittedStudents.length > 0) {
    lines.push('未繳交名單：');
    report.notSubmittedStudents.forEach((student, index) => {
      const seatStr = student.seatNumber ? `${student.seatNumber}號 ` : '';
      lines.push(`${index + 1}. ${seatStr}${student.name}`);
    });
  } else {
    lines.push('✅ 全班已繳交完成！');
  }

  return lines.join('\n');
}

function generatePrintReport(report: ReportData): string {
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>${report.item.name} - 繳交報表</title>
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
  <h1>📋 ${report.item.name}</h1>
  
  <div class="summary">
    <div class="summary-item">
      <div class="value submitted">${report.summary.submitted}</div>
      <div class="label">已繳交</div>
    </div>
    <div class="summary-item">
      <div class="value not-submitted">${report.summary.notSubmitted}</div>
      <div class="label">未繳交</div>
    </div>
    <div class="summary-item">
      <div class="value">${report.summary.submissionRate}%</div>
      <div class="label">繳交率</div>
    </div>
  </div>
  
  ${report.notSubmittedStudents.length > 0 ? `
  <h2>❌ 未繳交名單 (${report.summary.notSubmitted}人)</h2>
  <ul>
    ${report.notSubmittedStudents.map((s) => 
      `<li>${s.seatNumber ? `${s.seatNumber}號 ` : ''}${s.name}</li>`
    ).join('')}
  </ul>
  ` : '<p>✅ 全班已繳交完成！</p>'}
  
  ${report.submittedStudents.length > 0 ? `
  <h2>✓ 已繳交名單 (${report.summary.submitted}人)</h2>
  <ul>
    ${report.submittedStudents.map((s) => 
      `<li>${s.seatNumber ? `${s.seatNumber}號 ` : ''}${s.name}</li>`
    ).join('')}
  </ul>
  ` : ''}
  
  <div class="footer">
    產生時間：${new Date().toLocaleString('zh-TW')}
  </div>
</body>
</html>
  `.trim();
}

