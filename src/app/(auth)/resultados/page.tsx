import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ResultadosView from '@/components/resultados/ResultadosView';

export const revalidate = 60;

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

  // Use service client to bypass RLS — picks table restricts reads to own rows,
  // but this page intentionally shows all participants' picks for transparency.
  //
  // Do NOT filter by .in('match_id', matchIds): passing 90+ UUIDs in a PostgREST
  // IN clause generates a URL that gets silently truncated by the Supabase proxy,
  // causing only the first ~5 match IDs to be filtered and most picks to be missing.
  // Instead fetch ALL picks and let the client-side picksByUser map handle implicit
  // filtering (cells only look up picks for the finished matches in the matches array).
  //
  // With ~25 users × ~150 matches ≈ 4000 total picks in the DB, 10000 is a safe ceiling.
  const serviceClient = createServiceClient();
  const { data: picks } = await serviceClient
    .from('picks')
    .select('user_id, match_id, home_pick, away_pick, points_earned')
    .limit(10000);

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
