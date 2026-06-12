import { NextResponse } from 'next/server';
import { syncFinishedMatches } from '@/lib/football-data';

function verifyCronSecret(req: Request): boolean {
  const auth = req.headers.get('Authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[cron/sync-fixtures] Starting finished-match sync via football-data.org...');
  const dryRun = process.env.CRON_DRY_RUN === 'true';

  if (dryRun) {
    console.log('[cron/sync-fixtures] DRY RUN — no DB writes');
    return NextResponse.json({ dry_run: true });
  }

  const { synced, errors } = await syncFinishedMatches();

  console.log(`[cron/sync-fixtures] Done. Synced: ${synced}, Errors: ${errors.length}`);
  if (errors.length) console.error('[cron/sync-fixtures] Errors:', errors);

  return NextResponse.json({ synced, errors });
}
