import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendAutoPickEmail } from '@/lib/notifications';

function verifyCronSecret(req: Request): boolean {
  return req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

function randomScore(): number {
  return Math.floor(Math.random() * 6); // 0–5
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
    return NextResponse.json({ locked: 0, autoAssigned: 0 });
  }

  let autoAssigned = 0;
  const errors: string[] = [];

  for (const match of matchesToLock) {
    // Get all active users
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('is_active', true);

    if (!allUsers?.length) continue;

    // Get users who already have a pick for this match
    const { data: existingPicks } = await supabase
      .from('picks')
      .select('user_id')
      .eq('match_id', match.id);

    const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) ?? []);
    const usersWithoutPick = allUsers.filter((u) => !pickedUserIds.has(u.id));

    if (dryRun) {
      console.log(
        `[cron/lock-picks] DRY RUN — Match ${match.home_team} vs ${match.away_team}: ` +
        `would auto-assign ${usersWithoutPick.length} picks`
      );
      continue;
    }

    // Auto-assign picks for users who missed the deadline
    for (const user of usersWithoutPick) {
      const homePick = randomScore();
      const awayPick = randomScore();
      const lockedAt = new Date().toISOString();

      const { error: insertErr } = await supabase
        .from('picks')
        .upsert({
          user_id:          user.id,
          match_id:         match.id,
          home_pick:        homePick,
          away_pick:        awayPick,
          is_auto_assigned: true,
          locked_at:        lockedAt,
        }, { onConflict: 'user_id,match_id' });

      if (insertErr) {
        errors.push(`Auto-assign ${user.id}/${match.id}: ${insertErr.message}`);
        continue;
      }

      autoAssigned++;

      // Send email notification
      await sendAutoPickEmail(
        user.email,
        user.display_name,
        match.home_team,
        match.away_team,
        homePick,
        awayPick,
        match.id
      );
    }

    // Lock all existing picks for this match too (set locked_at)
    await supabase
      .from('picks')
      .update({ locked_at: new Date().toISOString() })
      .eq('match_id', match.id)
      .is('locked_at', null);
  }

  console.log(`[cron/lock-picks] Matches processed: ${matchesToLock.length}, Auto-assigned: ${autoAssigned}`);
  return NextResponse.json({ locked: matchesToLock.length, autoAssigned, errors });
}
