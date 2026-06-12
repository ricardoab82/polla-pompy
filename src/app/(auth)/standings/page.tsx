import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import ProgressionChart, { type ChartDataPoint } from '@/components/standings/ProgressionChart';
import { FEATURES } from '@/lib/config';
import AutoRefresh from '@/components/ui/AutoRefresh';

export default async function StandingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [leaderboardRes, historyRes] = await Promise.all([
    supabase.from('leaderboard').select('*').order('rank'),
    FEATURES.progressionChart
      ? supabase
          .from('position_history')
          .select('user_id, snapshot_at, position')
          .order('snapshot_at')
      : Promise.resolve({ data: null }),
  ]);

  const leaderboard = leaderboardRes.data ?? [];

  // Build chart data: group snapshots by date, one column per user display name
  const userIdToName = new Map(leaderboard.map((r) => [r.user_id, r.display_name]));
  const byDate = new Map<string, ChartDataPoint>();
  for (const entry of historyRes.data ?? []) {
    const date = new Date(entry.snapshot_at).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota', day: 'numeric', month: 'short',
    });
    if (!byDate.has(date)) byDate.set(date, { date });
    const name = userIdToName.get(entry.user_id);
    if (name) byDate.get(date)![name] = entry.position;
  }

  const chartData       = Array.from(byDate.values());
  const chartUsers      = leaderboard.map((r) => r.display_name);
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
      </div>

      {FEATURES.progressionChart && (
        <div className="card">
          <h2 className="font-display text-2xl text-[#0a4a2e] mb-4">Progresión de posiciones</h2>
          <ProgressionChart data={chartData} users={chartUsers} currentUser={currentUserName} />
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Desempate: mayor cantidad de resultados exactos. Si sigue empatado, el premio se divide.
      </p>
    </div>
  );
}
