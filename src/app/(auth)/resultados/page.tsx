import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ResultadosView from '@/components/resultados/ResultadosView';

export const revalidate = 60;

type PickData = {
  user_id: string;
  match_id: string;
  home_pick: number;
  away_pick: number;
  points_earned: number | null;
  is_auto_assigned: boolean;
};

// PostgREST applies its default row cap even to SECURITY DEFINER RPC calls.
// Paginate in 1000-row batches until all picks are fetched.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAllPicks(client: any): Promise<PickData[]> {
  const all: PickData[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await client
      .rpc('get_all_picks_for_resultados')
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

export default async function ResultadosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [matchesRes, usersRes, leaderboardRes] = await Promise.all([
    supabase
      .from('matches')
      .select('id, home_team, away_team, kickoff_utc, phase, status, home_score, away_score')
      .eq('status', 'finished')
      .order('kickoff_utc'),
    supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .eq('is_active', true)
      .order('display_name'),
    supabase
      .from('leaderboard')
      .select('user_id, group_pts, knockout_pts, bonus_pts, special_pts, total_points, exact_results_count, rank')
      .order('total_points', { ascending: false }),
  ]);

  const matches     = matchesRes.data     ?? [];
  const users       = usersRes.data       ?? [];
  const leaderboard = leaderboardRes.data ?? [];

  // RPC (SECURITY DEFINER) bypasses RLS on the picks table and avoids the
  // PostgREST URL-length issue that occurs when filtering 90+ match UUIDs
  // via .in('match_id', [...]). Paginated in batches of 1000 because
  // PostgREST applies its row cap even to RPC responses.
  const serviceClient = createServiceClient();
  const picks = await getAllPicks(serviceClient);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-[#0a4a2e]">Resultados y Puntos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Transparencia total de picks y puntuación</p>
      </div>
      <ResultadosView
        matches={matches}
        picks={picks ?? []}
        users={users}
        leaderboard={leaderboard as LbEntry[]}
        currentUserId={user.id}
      />
    </div>
  );
}

// Local type alias matching the leaderboard view shape used in this file only
type LbEntry = {
  user_id: string;
  group_pts: number;
  knockout_pts: number;
  bonus_pts: number;
  special_pts: number;
  total_points: number;
  exact_results_count: number;
  rank: number;
};
