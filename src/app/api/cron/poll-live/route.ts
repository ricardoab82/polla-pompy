import { NextResponse } from 'next/server';
import { pollLiveMatches } from '@/lib/football-data';
import { calculateMatchPoints } from '@/lib/points-engine';

function verifyCronSecret(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = process.env.CRON_DRY_RUN === 'true';

  if (dryRun) {
    console.log('[cron/poll-live] DRY RUN — would poll live matches');
    return NextResponse.json({ dry_run: true });
  }

  const { updated, finished, errors } = await pollLiveMatches();
  console.log(`[cron/poll-live] Updated: ${updated}, Newly finished: ${finished.length}`);

  // Calculate points for matches that just finished
  // `finished` contains Supabase match UUIDs directly
  const pointsResults: Array<{ matchId: string; processed: number; errors: string[] }> = [];

  for (const matchId of finished) {
    const result = await calculateMatchPoints(matchId);
    pointsResults.push({ matchId, ...result });
    console.log(`[cron/poll-live] Points calculated for match ${matchId}:`, result);
  }

  return NextResponse.json({ updated, finished: finished.length, pointsResults, errors });
}
