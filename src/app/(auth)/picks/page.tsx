import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BulkPicksList from '@/components/picks/BulkPicksList';

export default async function PicksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [matchesRes, picksRes] = await Promise.all([
    supabase
      .from('matches')
      .select('id, home_team, away_team, home_team_logo, away_team_logo, kickoff_utc, phase, status, home_score, away_score, is_colombia_match')
      .not('status', 'eq', 'cancelled')
      .order('kickoff_utc'),
    supabase
      .from('picks')
      .select('match_id, home_pick, away_pick, is_auto_assigned, points_earned')
      .eq('user_id', user.id),
  ]);

  const matches = matchesRes.data ?? [];
  const picks   = picksRes.data ?? [];

  // Get bonus question counts per match (for the 🎯 badge)
  const matchIds = matches.map((m) => m.id);
  const { data: bonusRows } = matchIds.length
    ? await supabase
        .from('bonus_questions')
        .select('match_id')
        .in('match_id', matchIds)
    : { data: [] };

  const countMap = new Map<string, number>();
  for (const row of bonusRows ?? []) {
    countMap.set(row.match_id, (countMap.get(row.match_id) ?? 0) + 1);
  }
  const bonusCounts = Array.from(countMap.entries()).map(([match_id, count]) => ({ match_id, count }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <BulkPicksList matches={matches} picks={picks} bonusCounts={bonusCounts} />
    </div>
  );
}
