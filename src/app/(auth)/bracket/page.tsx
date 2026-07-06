import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BracketView from '@/components/bracket/BracketView';

export const revalidate = 60;

const KNOCKOUT_PHASES = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];

export default async function BracketPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: matches }, { data: picks }, { data: openGroupMatches }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .in('phase', KNOCKOUT_PHASES)
      .neq('status', 'cancelled')
      .order('kickoff_utc'),
    supabase
      .from('picks')
      .select('match_id, home_pick, away_pick, points_earned')
      .eq('user_id', user.id),
    // Bracket picks are open while any group match is still scheduled or live
    supabase
      .from('matches')
      .select('id')
      .eq('phase', 'group')
      .in('status', ['scheduled', 'live'])
      .limit(1),
  ]);

  const pickMap: Record<string, { home_pick: number; away_pick: number; points_earned: number | null }> = {};
  for (const p of picks ?? []) {
    pickMap[p.match_id] = p;
  }

  // Picks are open while the group stage hasn't fully finished
  const bracketPicksOpen = (openGroupMatches?.length ?? 0) > 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-[#0a4a2e]">Llaves</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fase eliminatoria · Mundial 2026</p>
        </div>
        <span
          className={`mt-1 text-xs px-2.5 py-1 rounded-full font-medium ${
            bracketPicksOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {bracketPicksOpen ? 'Picks abiertos' : 'Picks cerrados'}
        </span>
      </div>
      <BracketView
        matches={matches ?? []}
        pickMap={pickMap}
        bracketPicksOpen={bracketPicksOpen}
      />
    </div>
  );
}
