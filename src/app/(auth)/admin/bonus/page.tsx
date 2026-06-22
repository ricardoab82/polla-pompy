import { requireAdmin } from '@/lib/auth-helpers';
import Link from 'next/link';
import ScrollToFirst from './ScrollToFirst';

export default async function AdminBonusPage() {
  const { supabase } = await requireAdmin();

  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc, phase, status')
    .not('status', 'eq', 'cancelled')
    .order('kickoff_utc')
    .limit(100);

  const matchIds = matches?.map((m) => m.id) ?? [];

  const { data: questions } = await supabase
    .from('bonus_questions')
    .select('match_id, correct_answer')
    .in('match_id', matchIds);

  // Per match: total questions and how many have been graded
  const qMap = new Map<string, { total: number; graded: number }>();
  for (const q of questions ?? []) {
    const curr = qMap.get(q.match_id) ?? { total: 0, graded: 0 };
    qMap.set(q.match_id, {
      total:  curr.total + 1,
      graded: curr.graded + (q.correct_answer !== null ? 1 : 0),
    });
  }

  const now = new Date();

  // First upcoming scheduled match for auto-scroll
  const firstScheduledId = matches?.find(
    (m) => m.status === 'scheduled' && new Date(m.kickoff_utc) >= now
  )?.id ?? null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {firstScheduledId && <ScrollToFirst id={`match-${firstScheduledId}`} />}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
          <h1 className="font-display text-4xl text-[#0a4a2e]">Bonus por partido</h1>
        </div>
        {firstScheduledId && (
          <a
            href={`#match-${firstScheduledId}`}
            className="text-sm text-[#0a4a2e] border border-[#0a4a2e]/30 px-3 py-1.5
                       rounded-lg hover:bg-[#0a4a2e]/5 transition-colors whitespace-nowrap"
          >
            Próximos partidos ↓
          </a>
        )}
      </div>

      <div className="space-y-2">
        {matches?.map((match) => {
          const { total = 0, graded = 0 } = qMap.get(match.id) ?? {};
          const status = match.status as string;

          const isFullyGraded  = status === 'finished' && total > 0 && graded === total;
          const isFinishedNoQs = status === 'finished' && total === 0;
          const needsGrading   = (status === 'live' || status === 'finished') && total > 0 && graded < total;
          const isScheduled    = status === 'scheduled';

          const dateLabel = new Date(match.kickoff_utc).toLocaleDateString('es-CO', {
            timeZone: 'America/Bogota', weekday: 'short', day: 'numeric', month: 'short',
          });

          // Muted, non-clickable states
          if (isFullyGraded || isFinishedNoQs) {
            return (
              <div
                key={match.id}
                id={`match-${match.id}`}
                className="card flex items-center justify-between opacity-50"
              >
                <div>
                  <p className="font-semibold text-gray-500">
                    {match.home_team} vs {match.away_team}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                    {total} preguntas
                  </span>
                  {isFullyGraded && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      ✓ Calificado
                    </span>
                  )}
                  {isFinishedNoQs && (
                    <span className="text-xs text-gray-400">Sin preguntas</span>
                  )}
                </div>
              </div>
            );
          }

          // Active link states
          return (
            <Link
              key={match.id}
              id={`match-${match.id}`}
              href={`/admin/bonus/${match.id}`}
              className={`card flex items-center justify-between transition-shadow
                ${needsGrading
                  ? 'hover:shadow-md border-2 border-amber-400'
                  : 'hover:shadow-md'}`}
            >
              <div>
                <p className="font-semibold">{match.home_team} vs {match.away_team}</p>
                <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full
                  ${total > 0 ? 'bg-[#e8f5e9] text-[#0a4a2e]' : 'bg-gray-100 text-gray-400'}`}>
                  {total} preguntas
                </span>
                {needsGrading ? (
                  <span className="text-sm font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                    Calificar bonus →
                  </span>
                ) : isScheduled ? (
                  <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#0a4a2e]">
                    Agregar preguntas bonus →
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
