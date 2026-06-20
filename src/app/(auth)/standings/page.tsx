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

  const [leaderboardRes, bumpRes] = await Promise.all([
    supabase
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
      .order('exact_results_count', { ascending: false })
      .order('bonus_pts', { ascending: false }),
    FEATURES.progressionChart
      ? supabase.rpc('get_bump_chart_data')
      : Promise.resolve({ data: null }),
  ]);

  const leaderboard = leaderboardRes.data ?? [];

  // Build chart data from the RPC result.
  // The RPC returns one row per (match × user), already ordered by match_order.
  // Group rows by match_order to produce one BumpChartPoint per match.
  const userLatestPoints = new Map<string, number>();
  const matchPoints      = new Map<number, BumpChartPoint>();

  for (const row of bumpRes.data ?? []) {
    if (!matchPoints.has(row.match_order)) {
      matchPoints.set(row.match_order, { label: row.x_label });
    }
    matchPoints.get(row.match_order)![row.display_name] = row.user_position;
    userLatestPoints.set(row.display_name, row.total_points);
  }

  const chartData: BumpChartPoint[] = Array.from(matchPoints.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, point]) => point);

  // Only show users who have earned at least 1 point
  const activeUsers     = leaderboard
    .map((r) => r.display_name)
    .filter((name) => (userLatestPoints.get(name) ?? 0) > 0);
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
