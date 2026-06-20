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
  // Why by day: snapshotPositions() runs after every match and recalculations
  // can produce dozens of snapshots within seconds. Taking raw "last 10 timestamps"
  // would show only today's positions across all chart points. Instead we:
  //   1. Find the LAST snapshot_at for each calendar day (Colombia UTC-5)
  //   2. Read positions only from those canonical snapshots
  //   3. Show last 10 days — one meaningful data point per matchday
  const toColombiaDate = (ts: string) =>
    new Date(ts).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota', day: 'numeric', month: 'short',
    });

  // 1. Latest snapshot_at per calendar day
  const dayToLastTs = new Map<string, string>();
  for (const entry of historyRes.data ?? []) {
    const day = toColombiaDate(entry.snapshot_at);
    const cur = dayToLastTs.get(day);
    if (!cur || entry.snapshot_at > cur) dayToLastTs.set(day, entry.snapshot_at);
  }
  const canonicalTs = new Set(dayToLastTs.values());

  // 2. Collect positions only from canonical snapshots
  const snapsByTs        = new Map<string, Map<string, number>>();
  const userLatestPoints = new Map<string, number>();
  for (const entry of historyRes.data ?? []) {
    if (!canonicalTs.has(entry.snapshot_at)) continue;
    const name = userIdToName.get(entry.user_id);
    if (!name) continue;
    if (!snapsByTs.has(entry.snapshot_at)) snapsByTs.set(entry.snapshot_at, new Map());
    snapsByTs.get(entry.snapshot_at)!.set(name, entry.position);
    userLatestPoints.set(name, entry.total_points);
  }

  // 3. Sort days by their canonical timestamp, take last 10
  const sortedDays = Array.from(dayToLastTs.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .slice(-10);

  const chartData: BumpChartPoint[] = sortedDays.map(([label, ts]) => {
    const point: BumpChartPoint = { label };
    snapsByTs.get(ts)?.forEach((pos, name) => { point[name] = pos; });
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
