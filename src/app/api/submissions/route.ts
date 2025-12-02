import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface SubmissionInput {
  studentId: string;
  itemId: string;
  status: 'SUBMITTED' | 'NOT_SUBMITTED';
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { submissions } = body as { submissions: SubmissionInput[] };

    if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
      return NextResponse.json(
        { error: '請提供要更新的繳交記錄' },
        { status: 400 }
      );
    }

    // Validate all submissions
    for (const submission of submissions) {
      if (!submission.studentId || !submission.itemId || !submission.status) {
        return NextResponse.json(
          { error: '每筆記錄都需要 studentId, itemId, status' },
          { status: 400 }
        );
      }
      if (!['SUBMITTED', 'NOT_SUBMITTED'].includes(submission.status)) {
        return NextResponse.json(
          { error: 'status 必須為 SUBMITTED 或 NOT_SUBMITTED' },
          { status: 400 }
        );
      }
    }

    // Upsert all submissions
    const results = await Promise.all(
      submissions.map((submission) =>
        prisma.submission.upsert({
          where: {
            studentId_itemId: {
              studentId: submission.studentId,
              itemId: submission.itemId,
            },
          },
          update: {
            status: submission.status,
            syncedAt: new Date(),
          },
          create: {
            studentId: submission.studentId,
            itemId: submission.itemId,
            status: submission.status,
            syncedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      updated: results.length,
      submissions: results,
    });
  } catch (error) {
    console.error('Failed to update submissions:', error);
    return NextResponse.json(
      { error: '更新繳交記錄失敗' },
      { status: 500 }
    );
  }
}

