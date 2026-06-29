import { requireAdmin } from '@/lib/auth-helpers';
import { updateMatchResultAction, recalculateMatchPointsAction, setMatchWinnerAction } from '@/features/admin/actions';
import { formAction } from '@/lib/form-action';

function formatKickoff(utc: string): string {
  return new Date(utc).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: '📅 Programado',
  live:      '🔴 En vivo',
  finished:  '✅ Finalizado',
  cancelled: '❌ Cancelado',
};

export default async function AdminMatchesPage() {
  const { supabase } = await requireAdmin();

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .not('status', 'eq', 'cancelled')
    .order('kickoff_utc')
    .limit(100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
        <h1 className="font-display text-4xl text-[#0a4a2e]">Partidos</h1>
      </div>

      <div className="space-y-3">
        {matches?.map((match) => (
          <div key={match.id} className="card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">
                  {match.home_team} vs {match.away_team}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatKickoff(match.kickoff_utc)} · {STATUS_LABELS[match.status] ?? match.status}
                  {match.home_score !== null && (
                    <span className="ml-2 font-bold text-[#0a4a2e]">
                      {match.home_score}–{match.away_score}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Manual result override */}
                <form action={formAction(updateMatchResultAction)} className="flex items-center gap-1 flex-wrap">
                  <input type="hidden" name="match_id" value={match.id} />
                  <select
                    name="match_status"
                    defaultValue={match.status === 'cancelled' ? 'finished' : match.status}
                    className="h-8 text-xs border border-gray-200 rounded px-1 text-gray-700"
                  >
                    <option value="scheduled">📅 Programado</option>
                    <option value="live">🔴 En vivo</option>
                    <option value="finished">✅ Finalizado</option>
                  </select>
                  <input
                    type="number" name="home_score" min="0" max="20"
                    defaultValue={match.home_score ?? ''}
                    className="w-10 h-8 text-center text-sm border border-gray-200 rounded"
                    placeholder="L"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="number" name="away_score" min="0" max="20"
                    defaultValue={match.away_score ?? ''}
                    className="w-10 h-8 text-center text-sm border border-gray-200 rounded"
                    placeholder="V"
                  />
                  <button
                    type="submit"
                    className="text-xs bg-[#0a4a2e] text-[#f5c842] px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Guardar
                  </button>
                </form>

                {/* Recalculate */}
                {match.status === 'finished' && (
                  <form action={formAction(recalculateMatchPointsAction)}>
                    <input type="hidden" name="match_id" value={match.id} />
                    <button
                      type="submit"
                      className="text-xs border border-[#0a4a2e] text-[#0a4a2e] px-3 py-1.5 rounded-lg font-semibold"
                    >
                      Recalcular pts
                    </button>
                  </form>
                )}

                {/* Bracket advancement override — for knockout matches with ET/penalties */}
                {match.status === 'finished' &&
                 match.next_match_id &&
                 match.phase !== 'group' && (
                  <form action={formAction(setMatchWinnerAction)} className="flex items-center gap-1">
                    <input type="hidden" name="match_id" value={match.id} />
                    <select
                      name="winner"
                      className="h-8 text-xs border border-amber-400 rounded px-1 text-gray-700"
                    >
                      <option value="home">{match.home_team}</option>
                      <option value="away">{match.away_team}</option>
                    </select>
                    <button
                      type="submit"
                      className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold"
                    >
                      Definir ganador
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
