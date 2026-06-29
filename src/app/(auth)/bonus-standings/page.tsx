import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';

export default async function BonusStandingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();

  // Aggregate current-week bonus points via RPC (SECURITY DEFINER, no row limit).
  // Sums bonus_answers.points_earned WHERE week_number IS NULL per active user.
  const { data: currentWeek } = await serviceClient.rpc('get_current_week_bonus');

  // Attach avatar_url (not in RPC result) and rank
  const { data: users } = await serviceClient
    .from('users')
    .select('id, display_name, avatar_url')
    .eq('is_active', true);

  const avatarMap = new Map((users ?? []).map((u) => [u.id, u.avatar_url]));

  const rows = (currentWeek ?? []) as { user_id: string; display_name: string; bonus_pts: number }[];

  let rank = 1;
  const ranked = rows.map((r, i) => {
    if (i > 0 && r.bonus_pts < rows[i - 1].bonus_pts) rank = i + 1;
    return { ...r, rank, avatar_url: avatarMap.get(r.user_id) ?? null };
  });

  // Past weeks — ordered descending by week_number, then by rank
  const { data: pastWeeks } = await serviceClient
    .from('bonus_weekly_standings')
    .select('week_number, week_start, week_end, user_id, bonus_points_this_week, rank, sponsor_prize, finalized')
    .eq('finalized', true)
    .order('week_number', { ascending: false })
    .order('rank');

  // Group past weeks
  const weekMap = new Map<number, typeof pastWeeks>();
  for (const row of pastWeeks ?? []) {
    if (!weekMap.has(row.week_number)) weekMap.set(row.week_number, []);
    weekMap.get(row.week_number)!.push(row);
  }

  // Derive current week end from the last closed week (same logic as admin/bonus-weeks).
  const INITIAL_WEEK_END = '2026-06-21';
  const lastClosedWeekEnd = (() => {
    if (!pastWeeks || pastWeeks.length === 0) return INITIAL_WEEK_END;
    const sorted = [...pastWeeks].sort((a, b) => b.week_number - a.week_number);
    return sorted[0].week_end as string;
  })();
  const currentWeekEnd = (() => {
    const d = new Date(lastClosedWeekEnd + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    return d;
  })();

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <h1 className="font-display text-4xl text-[#0a4a2e]">Bonus Semanal</h1>

      {/* Current week */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-[#0a4a2e]">Semana actual</h2>
          <div className="text-right">
            <p className="text-xs text-gray-400">Cierra el</p>
            <p className="text-sm font-semibold text-gray-600">
              {currentWeekEnd.toLocaleDateString('es-CO', {
                timeZone: 'America/Bogota',
                weekday: 'short', day: 'numeric', month: 'short',
              })}
            </p>
          </div>
        </div>

        {ranked.every((r) => r.bonus_pts === 0) ? (
          <p className="text-center text-gray-400 py-4">
            No hay puntos bonus acumulados esta semana aún.
          </p>
        ) : (
          <div className="space-y-2">
            {ranked.map((row) => (
              <div
                key={row.user_id}
                className={`flex items-center gap-3 py-2 px-3 rounded-xl
                  ${row.user_id === user.id ? 'bg-[#e8f5e9] font-semibold' : 'hover:bg-gray-50'}`}
              >
                <span className="w-8 text-center font-display text-lg text-[#0a4a2e]">
                  #{row.rank}
                </span>
                <Avatar displayName={row.display_name} avatarUrl={row.avatar_url} size={28} />
                <span className="flex-1 text-sm">{row.display_name}</span>
                <span className="font-bold text-[#0a4a2e]">{row.bonus_pts} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past weeks archive */}
      {weekMap.size > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-gray-700">Semanas anteriores</h2>
          {Array.from(weekMap.entries()).map(([weekNum, rows]) => {
            const first = rows![0];
            const prize = first?.sponsor_prize;
            const winner = rows?.find((r) => r.rank === 1);
            const winnerUser = winner ? userMap.get(winner.user_id) : null;

            return (
              <div key={weekNum} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Semana {weekNum}</h3>
                    <p className="text-xs text-gray-400">
                      {first?.week_start} → {first?.week_end}
                    </p>
                  </div>
                  {prize && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Premio</p>
                      <p className="text-sm font-semibold text-[#f5c842] bg-[#0a4a2e] px-2 py-0.5 rounded">
                        {prize}
                      </p>
                    </div>
                  )}
                </div>

                {winnerUser && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-[#fffbeb] rounded-lg border border-[#f5c842]/30">
                    <span>🥇</span>
                    <Avatar displayName={winnerUser.display_name} avatarUrl={winnerUser.avatar_url} size={24} />
                    <span className="text-sm font-semibold">{winnerUser.display_name}</span>
                    <span className="text-sm text-gray-500 ml-auto">{winner?.bonus_points_this_week} pts</span>
                  </div>
                )}

                <div className="space-y-1">
                  {rows!.slice(0, 5).map((row) => {
                    const u = userMap.get(row.user_id);
                    if (!u) return null;
                    return (
                      <div key={row.user_id} className="flex items-center gap-2 text-sm py-1">
                        <span className="w-6 text-center text-gray-400">#{row.rank}</span>
                        <span className="flex-1 text-gray-700">{u.display_name}</span>
                        <span className="font-semibold text-gray-600">{row.bonus_points_this_week} pts</span>
                      </div>
                    );
                  })}
                  {rows!.length > 5 && (
                    <p className="text-xs text-gray-400 text-center pt-1">+{rows!.length - 5} más</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
