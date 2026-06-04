import { NextResponse } from 'next/server';
import { pollLiveMatches, getTodayApiUsage } from '@/lib/api-football';
import { calculateMatchPoints } from '@/lib/points-engine';
import { createServiceClient } from '@/lib/supabase/server';
import { sendApiUsageAlert } from '@/lib/notifications';
import { API_USAGE_SLOW_POLL_THRESHOLD, API_USAGE_STOP_THRESHOLD } from '@/lib/config';

function verifyCronSecret(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = process.env.CRON_DRY_RUN === 'true';

  // Check API usage limits
  const usageCount = await getTodayApiUsage();

  if (usageCount >= API_USAGE_STOP_THRESHOLD) {
    console.warn(`[cron/poll-live] API usage at ${usageCount}/100 — polling STOPPED`);
    await sendApiUsageAlert(usageCount);
    return NextResponse.json({ stopped: true, usage: usageCount });
  }

  if (usageCount >= API_USAGE_SLOW_POLL_THRESHOLD) {
    console.warn(`[cron/poll-live] API usage at ${usageCount}/100 — slow poll mode`);
    await sendApiUsageAlert(usageCount);
    // Still poll but log the warning
  }

  if (dryRun) {
    console.log('[cron/poll-live] DRY RUN — would poll live matches');
    return NextResponse.json({ dry_run: true, usage: usageCount });
  }

  const { updated, finished, errors } = await pollLiveMatches();
  console.log(`[cron/poll-live] Updated: ${updated}, Newly finished: ${finished.length}`);

  // Calculate points for matches that just finished
  const pointsResults: Array<{ matchId: string; processed: number; errors: string[] }> = [];

  for (const apiMatchId of finished) {
    const supabase = createServiceClient();
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('api_match_id', Number(apiMatchId))
      .single();

    if (match) {
      const result = await calculateMatchPoints(match.id);
      pointsResults.push({ matchId: match.id, ...result });
      console.log(`[cron/poll-live] Points calculated for match ${match.id}:`, result);
    }
  }

  return NextResponse.json({ updated, finished: finished.length, pointsResults, errors });
}
