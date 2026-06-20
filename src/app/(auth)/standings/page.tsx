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

  // Build bump chart data: group by distinct snapshot_at, label as J1, J2, …
  // Each distinct snapshot represents one match that finished.
  // Take the last 10 snapshots to keep the chart readable.
  const snapsByTime = new Map<string, Map<string, number>>();
  const userLatestPoints = new Map<string, number>();

  for (const entry of historyRes.data ?? []) {
    const name = userIdToName.get(entry.user_id);
    if (!name) continue;
    if (!snapsByTime.has(entry.snapshot_at)) snapsByTime.set(entry.snapshot_at, new Map());
    snapsByTime.get(entry.snapshot_at)!.set(name, entry.position);
    // Keep overwriting so we end up with the latest total_points per user
    userLatestPoints.set(name, entry.total_points);
  }

  const sortedTimes = Array.from(snapsByTime.keys()).sort();
  const lastTen    = sortedTimes.slice(-10);

  const chartData: BumpChartPoint[] = lastTen.map((ts, i) => {
    const point: BumpChartPoint = { label: `J${i + 1}` };
    snapsByTime.get(ts)!.forEach((pos, name) => { point[name] = pos; });
    return point;
  });

  // Only show users who have earned at least 1 point (suppresses 0-point clutter)
  const allUsers     = leaderboard.map((r) => r.display_name);
  const activeUsers  = allUsers.filter((name) => (userLatestPoints.get(name) ?? 0) > 0);
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
