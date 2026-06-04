import { requireAdmin } from '@/lib/auth-helpers';
import Link from 'next/link';

export default async function AdminBonusPage() {
  const { supabase } = await requireAdmin();

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc, phase')
    .not('status', 'eq', 'cancelled')
    .order('kickoff_utc')
    .limit(100);

  const matchIds = matches?.map((m) => m.id) ?? [];
  const { data: questionCounts } = await supabase
    .from('bonus_questions')
    .select('match_id')
    .in('match_id', matchIds);

  const countMap = new Map<string, number>();
  questionCounts?.forEach((q) => countMap.set(q.match_id, (countMap.get(q.match_id) ?? 0) + 1));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
        <h1 className="font-display text-4xl text-[#0a4a2e]">Bonus por partido</h1>
      </div>

      <div className="space-y-2">
        {matches?.map((match) => {
          const count = countMap.get(match.id) ?? 0;
          return (
            <Link
              key={match.id}
              href={`/admin/bonus/${match.id}`}
              className="card flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <p className="font-semibold">{match.home_team} vs {match.away_team}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(match.kickoff_utc).toLocaleDateString('es-CO', {
                    timeZone: 'America/Bogota', day: 'numeric', month: 'short',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full
                  ${count > 0 ? 'bg-[#e8f5e9] text-[#0a4a2e]' : 'bg-gray-100 text-gray-400'}`}>
                  {count}/5 preguntas
                </span>
                <span className="text-gray-400">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
