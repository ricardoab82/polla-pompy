import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPickReminder } from '@/lib/notifications';

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

  // Find matches kicking off between 1h and 3h from now (reminder window)
  const oneHour   = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const threeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const { data: upcomingMatches, error: matchErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc')
    .eq('status', 'scheduled')
    .gte('kickoff_utc', oneHour.toISOString())
    .lte('kickoff_utc', threeHours.toISOString());

  if (matchErr) {
    console.error('[cron/reminders] Match query error:', matchErr);
    return NextResponse.json({ error: matchErr.message }, { status: 500 });
  }

  if (!upcomingMatches?.length) {
    return NextResponse.json({ reminders: 0 });
  }

  let remindersSent = 0;
  const errors: string[] = [];

  for (const match of upcomingMatches) {
    // Get active users
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('is_active', true);

    if (!allUsers?.length) continue;

    // Get users who already picked
    const { data: existingPicks } = await supabase
      .from('picks')
      .select('user_id')
      .eq('match_id', match.id);

    const pickedUserIds = new Set(existingPicks?.map((p) => p.user_id) ?? []);

    // Get users who already received a reminder for this match
    const { data: alreadySent } = await supabase
      .from('reminders_sent')
      .select('user_id')
      .eq('match_id', match.id);

    const alreadySentIds = new Set(alreadySent?.map((r) => r.user_id) ?? []);

    const usersToRemind = allUsers.filter(
      (u) => !pickedUserIds.has(u.id) && !alreadySentIds.has(u.id)
    );

    if (dryRun) {
      console.log(
        `[cron/reminders] DRY RUN — Match ${match.home_team} vs ${match.away_team}: ` +
        `would send ${usersToRemind.length} reminders`
      );
      continue;
    }

    for (const user of usersToRemind) {
      await sendPickReminder(
        user.email,
        user.display_name,
        match.home_team,
        match.away_team,
        match.kickoff_utc,
        match.id
      );

      // Record reminder sent (ignore duplicates due to unique constraint)
      await supabase
        .from('reminders_sent')
        .upsert({ match_id: match.id, user_id: user.id }, { onConflict: 'match_id,user_id' });

      remindersSent++;
    }
  }

  console.log(`[cron/reminders] Sent: ${remindersSent}, Matches checked: ${upcomingMatches.length}`);
  return NextResponse.json({ reminders: remindersSent, errors });
}
