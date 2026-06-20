import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import BumpChart, { type BumpChartPoint } from '@/components/standings/BumpChart';
import { FEATURES } from '@/lib/config';
import AutoRefresh from '@/components/ui/AutoRefresh';

export default async function StandingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [leaderboardRes, historyRes] = await Promise.all([
    supabase
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
      .order('exact_results_count', { ascending: false })
      .order('bonus_pts', { ascending: false }),
    FEATURES.progressionChart
      ? supabase
          .from('position_history')
          .select('user_id, snapshot_at, position, total_points')
          .order('snapshot_at')
      : Promise.resolve({ data: null }),
  ]);

  const leaderboard = leaderboardRes.data ?? [];
  const userIdToName = new Map(leaderboard.map((r) => [r.user_id, r.display_name]));

  // Build bump chart data grouped by Colombia-time calendar day.
  //
  // snapshotPositions() runs after every finished match, and admin
  // recalculations can fire dozens of snapshots within seconds.
  // We group by Colombia-time date and keep ONLY the LAST snapshot
  // of each day, so recalculation noise is suppressed and each chart
  // point reflects the final standings at end-of-day.
  //
  // Single-pass approach (data already sorted ASC by snapshot_at):
  // when snapshot_at changes within the same Colombia day, we reset
  // that day's position map so only the last snapshot's data survives.
  const toColombiaDate = (ts: string) =>
    new Date(ts).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota', day: 'numeric', month: 'short',
    });

  const snapsByDay       = new Map<string, { ts: string; positions: Map<string, number> }>();
  const userLatestPoints = new Map<string, number>();

  for (const entry of historyRes.data ?? []) {
    const name = userIdToName.get(entry.user_id);
    if (!name) continue;

    const day      = toColombiaDate(entry.snapshot_at);
    const existing = snapsByDay.get(day);

    if (!existing || existing.ts !== entry.snapshot_at) {
      // New (later) snapshot for this day — start fresh with this user
      snapsByDay.set(day, {
        ts:        entry.snapshot_at,
        positions: new Map([[name, entry.position]]),
      });
    } else {
      // Same snapshot batch — add this user's position
      existing.positions.set(name, entry.position);
    }

    userLatestPoints.set(name, entry.total_points);
  }

  // Sort days by their canonical snapshot timestamp, take last 10
  const sortedDays = Array.from(snapsByDay.entries())
    .sort((a, b) => a[1].ts.localeCompare(b[1].ts))
    .slice(-10);

  const chartData: BumpChartPoint[] = sortedDays.map(([label, { positions }]) => {
    const point: BumpChartPoint = { label };
    positions.forEach((pos, name) => { point[name] = pos; });
    return point;
  });

  // Only show users who have earned at least 1 point (suppresses 0-point clutter)
  const allUsers        = leaderboard.map((r) => r.display_name);
  const activeUsers     = allUsers.filter((name) => (userLatestPoints.get(name) ?? 0) > 0);
  const currentUserName = leaderboard.find((r) => r.user_id === user.id)?.display_name ?? '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <AutoRefresh />
      <h1 className="font-display text-4xl text-[#0a4a2e]">Posiciones</h1>

      <div className="card">
        {leaderboard.length ? (
          <LeaderboardTable rows={leaderboard} currentUserId={user.id} />
        ) : (
          <p className="text-center py-8 text-gray-400">
            La tabla se actualizará cuando comiencen los partidos.
          </p>
        )}

        {/* Tiebreaker note */}
        <p className="mt-4 text-xs text-gray-400 text-center">
          ⚖️ En caso de empate: 1° Mayor número de resultados exactos · 2° Mayor puntaje acumulado en Bonus
        </p>
      </div>

      {FEATURES.progressionChart && (
        <div className="card">
          <h2 className="font-display text-2xl text-[#0a4a2e] mb-4">Progresión de posiciones</h2>
          <BumpChart
            data={chartData}
            users={activeUsers}
            currentUser={currentUserName}
            totalUsers={leaderboard.length}
          />
        </div>
      )}
    </div>
  );
}
