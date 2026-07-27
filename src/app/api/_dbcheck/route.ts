import { NextResponse } from 'next/server';

// ⚠️ 臨時診斷端點——確認 D1 連線問題後請刪除。GET 無副作用。
export async function GET() {
  const info: Record<string, unknown> = {};

  // 1) runtime 全域特徵：判斷環境偵測是否正確
  try {
    info.hasWebSocketPair = typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined';
    info.navigatorUA = (globalThis as { navigator?: { userAgent?: string } }).navigator?.userAgent ?? null;
    info.nodeEnv = process.env.NODE_ENV ?? null;
  } catch (e) {
    info.globalsErr = String(e);
  }

  // 2) getCloudflareContext 是否拿得到 env.DB
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    info.ctxOk = true;
    info.hasDB = !!(ctx.env as { DB?: unknown } | undefined)?.DB;
    info.envKeys = ctx.env ? Object.keys(ctx.env as object) : null;
  } catch (e) {
    info.ctxErr = e instanceof Error ? e.message : String(e);
  }

  // 3) 實際跑一個查詢，抓真正的錯誤與 stack
  try {
    const { getDb } = await import('@/lib/db');
    const prisma = await getDb();
    info.teacherCount = await prisma.teacher.count();
    info.dbQueryOk = true;
  } catch (e) {
    info.dbQueryErr = e instanceof Error ? e.message : String(e);
    info.dbQueryStack = e instanceof Error ? (e.stack ?? '').split('\n').slice(0, 6) : null;
  }

  return NextResponse.json(info);
}
