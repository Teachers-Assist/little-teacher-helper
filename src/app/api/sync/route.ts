import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface SyncOperation {
  id: string;
  type: 'UPDATE_SUBMISSION';
  payload: {
    studentId: string;
    itemId: string;
    status: 'SUBMITTED' | 'NOT_SUBMITTED';
  };
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, operations } = body as {
      deviceId?: string;
      operations: SyncOperation[];
    };

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: '請提供要同步的操作' },
        { status: 400 }
      );
    }

    const syncedIds: string[] = [];
    const conflicts: Array<{
      operationId: string;
      reason: string;
    }> = [];

    // Process each operation
    for (const operation of operations) {
      if (operation.type !== 'UPDATE_SUBMISSION') {
        conflicts.push({
          operationId: operation.id,
          reason: '不支援的操作類型',
        });
        continue;
      }

      try {
        // Check if the submission exists
        const existing = await prisma.submission.findUnique({
          where: {
            studentId_itemId: {
              studentId: operation.payload.studentId,
              itemId: operation.payload.itemId,
            },
          },
        });

        // If exists and was updated more recently on server, it's a conflict
        if (
          existing &&
          existing.updatedAt > new Date(operation.timestamp)
        ) {
          // Server version is newer - still apply client change for LWW
          // but note the conflict
        }

        // Upsert the submission
        await prisma.submission.upsert({
          where: {
            studentId_itemId: {
              studentId: operation.payload.studentId,
              itemId: operation.payload.itemId,
            },
          },
          update: {
            status: operation.payload.status,
            syncedAt: new Date(),
            updatedBy: deviceId || null,
          },
          create: {
            studentId: operation.payload.studentId,
            itemId: operation.payload.itemId,
            status: operation.payload.status,
            syncedAt: new Date(),
            updatedBy: deviceId || null,
          },
        });

        syncedIds.push(operation.id);
      } catch (error) {
        console.error('Failed to sync operation:', operation.id, error);
        conflicts.push({
          operationId: operation.id,
          reason: '同步失敗',
        });
      }
    }

    if (conflicts.length > 0 && syncedIds.length > 0) {
      // Partial success
      return NextResponse.json(
        {
          synced: syncedIds.length,
          operationIds: syncedIds,
          conflicts,
        },
        { status: 207 }
      ); // Multi-Status
    }

    if (conflicts.length > 0) {
      // All failed
      return NextResponse.json(
        {
          synced: 0,
          operationIds: [],
          conflicts,
        },
        { status: 409 }
      );
    }

    // All success
    return NextResponse.json({
      synced: syncedIds.length,
      operationIds: syncedIds,
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { error: '同步失敗' },
      { status: 500 }
    );
  }
}

