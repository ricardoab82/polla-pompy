import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BulkPicksList from '@/components/picks/BulkPicksList';

export default async function PicksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [matchesRes, picksRes, specialPicksRes] = await Promise.all([
    supabase
      .from('matches')
      .select('id, home_team, away_team, home_team_logo, away_team_logo, kickoff_utc, phase, status, home_score, away_score, is_colombia_match')
      .not('status', 'eq', 'cancelled')
      .order('kickoff_utc'),
    supabase
      .from('picks')
      .select('match_id, home_pick, away_pick, is_auto_assigned, points_earned')
      .eq('user_id', user.id),
    supabase
      .from('special_picks')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const matches       = matchesRes.data ?? [];
  const picks         = picksRes.data ?? [];
  const hasSpecialPicks = !!specialPicksRes.data;

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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Special picks banner */}
      {hasSpecialPicks ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-green-600 font-semibold text-sm">✅ Picks especiales completados</span>
          <Link href="/special-picks" className="ml-auto text-xs text-green-700 underline underline-offset-2 hover:text-green-900">
            Ver
          </Link>
        </div>
      ) : (
        <div className="card flex items-start gap-3">
          <span className="text-2xl">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#0a4a2e] text-sm leading-snug">
              ¿Ya ingresaste tus picks especiales?
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Campeón, Goleador, Balón de Oro y más — valen hasta 20 pts
            </p>
          </div>
          <Link
            href="/profile"
            className="btn-primary text-xs rounded-lg px-3 py-1.5 whitespace-nowrap flex-none"
          >
            Ver mis picks especiales
          </Link>
        </div>
      )}

      <BulkPicksList matches={matches} picks={picks} bonusCounts={bonusCounts} />
    </div>
  );
}
