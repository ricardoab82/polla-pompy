import { requireAdmin } from '@/lib/auth-helpers';
import { closeBonusWeekAction, assignSponsorPrizeAction } from '@/features/admin/actions';
import { formAction } from '@/lib/form-action';

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekBounds(weekNum: number, year: number): { start: string; end: string } {
  const simple = new Date(year, 0, 1 + (weekNum - 1) * 7);
  const dow = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - (dow <= 4 ? dow - 1 : dow - 8));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end:   sunday.toISOString().split('T')[0],
  };
}

export default async function AdminBonusWeeksPage() {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const currentWeek = getISOWeek(now);
  const year = now.getFullYear();
  const { start, end } = getWeekBounds(currentWeek, year);
  const { start: nextStart, end: nextEnd } = getWeekBounds(currentWeek + 1, year);

  // Get closed weeks
  const { data: closedWeeks } = await supabase
    .from('bonus_weekly_standings')
    .select('week_number, week_start, week_end, finalized, sponsor_prize')
    .eq('finalized', true)
    .order('week_number', { ascending: false });

  const closedWeekNums = new Set(closedWeeks?.map((w) => w.week_number) ?? []);
  const currentWeekClosed = closedWeekNums.has(currentWeek);

  const uniqueWeeks = Array.from(
    new Map(closedWeeks?.map((w) => [w.week_number, w]) ?? []).values()
  );

  // Active users for display
  const { data: activeUsers } = await supabase
    .from('users')
    .select('id, display_name')
    .eq('is_active', true);

  const userMap = new Map((activeUsers ?? []).map((u) => [u.id, u]));

  // Open bonus answers (current week = week_number IS NULL)
  const { data: openAnswers } = await supabase
    .from('bonus_answers')
    .select('user_id, points_earned')
    .is('week_number', null)
    .not('points_earned', 'is', null);

  // Build live leaderboard
  const ptsByUser = new Map<string, number>();
  for (const a of openAnswers ?? []) {
    ptsByUser.set(a.user_id, (ptsByUser.get(a.user_id) ?? 0) + (a.points_earned ?? 0));
  }

  const sorted = Array.from(ptsByUser.entries())
    .map(([uid, pts]) => ({ uid, pts }))
    .sort((a, b) => b.pts - a.pts);

  let rankCursor = 1;
  const liveRanking = sorted
    .map((r, i) => {
      if (i > 0 && r.pts < sorted[i - 1].pts) rankCursor = i + 1;
      return { ...r, rank: rankCursor, user: userMap.get(r.uid) };
    })
    .filter((r) => r.user != null);

  // Winners of past weeks (rank = 1)
  const { data: weekWinners } = await supabase
    .from('bonus_weekly_standings')
    .select('week_number, user_id')
    .eq('finalized', true)
    .eq('rank', 1);

  const winnerByWeek = new Map(
    (weekWinners ?? []).map((w) => [w.week_number, userMap.get(w.user_id)])
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
        <h1 className="font-display text-4xl text-[#0a4a2e]">Semanas Bonus</h1>
      </div>

      {/* Current active week */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Semana {currentWeek} (actual)</h2>
          {currentWeekClosed ? (
            <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
              ✓ Cerrada
            </span>
          ) : (
            <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium">
              Activa
            </span>
          )}
        </div>

        {!currentWeekClosed && (
          <>
            {/* Live bonus leaderboard */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Clasificación en vivo</h3>
              {liveRanking.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Sin puntos bonus esta semana aún.</p>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium w-10">#</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Jugador</th>
                        <th className="px-3 py-2 text-right text-gray-500 font-medium">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {liveRanking.map((r) => (
                        <tr key={r.uid} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{r.rank}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{r.user?.display_name}</td>
                          <td className="px-3 py-2 text-right font-semibold text-[#0a4a2e]">{r.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Close week form */}
            <form action={formAction(closeBonusWeekAction)} className="space-y-3">
              <input type="hidden" name="week_number" value={currentWeek} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Inicio de semana</label>
                  <input
                    type="date"
                    name="week_start"
                    defaultValue={start}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:border-[#0a4a2e] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fin de semana</label>
                  <input
                    type="date"
                    name="week_end"
                    defaultValue={end}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:border-[#0a4a2e] focus:outline-none"
                  />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">Cerrar semana</p>
                <p>Toma una foto de todos los puntos bonus actuales, asigna rankings y reinicia el contador para la próxima semana.</p>
              </div>
              <button type="submit" className="btn-primary rounded-xl py-2.5 px-6">
                Cerrar semana {currentWeek}
              </button>
            </form>
          </>
        )}

        {currentWeekClosed && (
          <p className="text-sm text-gray-500">
            Esta semana ya fue cerrada. Los puntos se acumulan ahora en la semana {currentWeek + 1}.
          </p>
        )}
      </div>

      {/* Next week card — shown when current is closed */}
      {currentWeekClosed && (
        <div className="card border-2 border-dashed border-[#0a4a2e]/20 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg text-[#0a4a2e]">Semana {currentWeek + 1}</h2>
              <p className="text-xs text-gray-400">{nextStart} → {nextEnd}</p>
            </div>
            <span className="text-sm text-[#0a4a2e] bg-[#0a4a2e]/10 px-3 py-1 rounded-full font-medium">
              Nueva semana activa
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {(openAnswers?.length ?? 0) > 0
              ? `${openAnswers!.length} respuesta(s) bonus acumuladas hasta ahora esta semana.`
              : 'Sin respuestas bonus esta semana aún.'}
          </p>
        </div>
      )}

      {/* Closed weeks */}
      {uniqueWeeks.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl text-gray-700">Semanas cerradas</h2>
          {uniqueWeeks.map((week) => {
            const winner = winnerByWeek.get(week.week_number);
            return (
              <div key={week.week_number} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Semana {week.week_number}</p>
                    <p className="text-xs text-gray-400">{week.week_start} → {week.week_end}</p>
                    {winner && (
                      <p className="text-sm text-[#0a4a2e] mt-1">
                        Ganador: <span className="font-semibold">{winner.display_name}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    ✓ Cerrada
                  </span>
                </div>

                {week.sponsor_prize && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-sm text-yellow-800">
                    Premio patrocinador: {week.sponsor_prize}
                  </div>
                )}

                <form action={formAction(assignSponsorPrizeAction)} className="flex gap-2">
                  <input type="hidden" name="week_number" value={week.week_number} />
                  <input
                    type="text"
                    name="sponsor_prize"
                    defaultValue={week.sponsor_prize ?? ''}
                    placeholder="Premio del patrocinador..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:border-[#0a4a2e] focus:outline-none"
                  />
                  <button type="submit" className="btn-secondary text-sm rounded-lg px-4 py-2 flex-none">
                    Guardar premio
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {uniqueWeeks.length === 0 && (
        <p className="text-center text-gray-400 py-6">No hay semanas cerradas aún.</p>
      )}
    </div>
  );
}
