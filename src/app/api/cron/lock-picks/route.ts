import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function verifyCronSecret(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = process.env.CRON_DRY_RUN === 'true';
  const supabase = createServiceClient();
  const now = new Date();

  // Find matches whose lock time has passed (kickoff - 1h <= now) but not yet locked
  const lockCutoff = new Date(now.getTime() + 60 * 60 * 1000); // now + 1h = kickoff threshold

  const { data: matchesToLock, error: matchErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc')
    .eq('status', 'scheduled')
    .lte('kickoff_utc', lockCutoff.toISOString());

  if (matchErr) {
    console.error('[cron/lock-picks] Match query error:', matchErr);
    return NextResponse.json({ error: matchErr.message }, { status: 500 });
  }

  if (!matchesToLock?.length) {
    return NextResponse.json({ locked: 0 });
  }

  if (dryRun) {
    console.log(`[cron/lock-picks] DRY RUN — would lock ${matchesToLock.length} matches`);
    return NextResponse.json({ locked: 0, dryRun: true });
  }

  const errors: string[] = [];

  for (const match of matchesToLock) {
    // Lock all existing picks for this match (set locked_at)
    const { error: lockErr } = await supabase
      .from('picks')
      .update({ locked_at: now.toISOString() })
      .eq('match_id', match.id)
      .is('locked_at', null);

    if (lockErr) {
      errors.push(`Lock picks ${match.id}: ${lockErr.message}`);
    }
  }

  console.log(`[cron/lock-picks] Matches processed: ${matchesToLock.length}`);
  return NextResponse.json({ locked: matchesToLock.length, errors });
}
