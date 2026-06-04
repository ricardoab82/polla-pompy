import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MatchCard from '@/components/match/MatchCard';
import type { MatchPhase } from '@/lib/supabase/types';

const PHASE_ORDER: MatchPhase[] = [
  'group', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final',
];

const PHASE_LABELS: Record<MatchPhase, string> = {
  group:        'Fase de grupos',
  round_of_32:  'Ronda de 32',
  round_of_16:  'Octavos de final',
  quarterfinal: 'Cuartos de final',
  semifinal:    'Semifinal',
  final:        'Gran Final',
};

export default async function PicksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .not('status', 'eq', 'cancelled')
    .order('kickoff_utc');

  const { data: myPicks } = await supabase
    .from('picks')
    .select('*')
    .eq('user_id', user.id);

  const picksByMatch = new Map(myPicks?.map((p) => [p.match_id, p]) ?? []);

  // Group by phase, then by date
  const byPhase = new Map<MatchPhase, typeof matches>();
  for (const match of matches ?? []) {
    const phase = match.phase as MatchPhase;
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    byPhase.get(phase)!.push(match);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <h1 className="font-display text-4xl text-[#0a4a2e]">Mis Picks</h1>

      {PHASE_ORDER.map((phase) => {
        const phaseMatches = byPhase.get(phase);
        if (!phaseMatches?.length) return null;

        return (
          <section key={phase}>
            <h2 className="font-display text-2xl text-gray-700 mb-3">
              {PHASE_LABELS[phase]}
            </h2>
            <div className="space-y-3">
              {phaseMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  pick={picksByMatch.get(match.id) ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}

      {(!matches || matches.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">⚽</p>
          <p>Los partidos aún no están disponibles.</p>
        </div>
      )}
    </div>
  );
}
