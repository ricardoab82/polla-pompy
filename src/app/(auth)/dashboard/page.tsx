import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Countdown from '@/components/ui/Countdown';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import { FEATURES, PICK_LOCK_MINUTES } from '@/lib/config';
import AutoRefresh from '@/components/ui/AutoRefresh';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // (profile fetched via TopBar; only leaderboard rank needed here)

  // Get leaderboard
  const { data: leaderboard } = await supabase
    .from('leaderboard')
    .select('*')
    .order('total_points', { ascending: false })
    .order('exact_results_count', { ascending: false })
    .order('bonus_pts', { ascending: false });

  const myRank = leaderboard?.find((r) => r.user_id === user.id);

  // Get next match (live first, then scheduled)
  const { data: nextMatch } = await supabase
    .from('matches')
    .select('id, home_team, away_team, home_team_logo, away_team_logo, kickoff_utc, status, is_colombia_match')
    .in('status', ['live', 'scheduled'])
    .order('kickoff_utc')
    .limit(1)
    .single();

  // Get my pick for next match
  let myNextPick = null;
  if (nextMatch) {
    const { data } = await supabase
      .from('picks')
      .select('home_pick, away_pick, is_auto_assigned')
      .eq('match_id', nextMatch.id)
      .eq('user_id', user.id)
      .single();
    myNextPick = data;
  }

  // Colombia match today/tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const { data: colombiaMatch } = await supabase
    .from('matches')
    .select('id, home_team, away_team, kickoff_utc')
    .eq('is_colombia_match', true)
    .eq('status', 'scheduled')
    .lte('kickoff_utc', tomorrow.toISOString())
    .order('kickoff_utc')
    .limit(1)
    .single();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <AutoRefresh />
      {/* My position card */}
      <div className="card bg-[#0a4a2e] text-white border-0">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-[#e8f5e9]/70 text-sm">Tu posición</p>
            <p className="font-display text-5xl text-[#f5c842]">
              #{myRank?.rank ?? '—'}
            </p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[#e8f5e9]/70 text-sm">Puntos totales</p>
            <p className="font-display text-5xl text-white">{myRank?.total_points ?? 0}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[#e8f5e9]/70 text-sm">Exactos</p>
            <p className="font-display text-5xl text-[#f5c842]">
              {String(myRank?.exact_results_count ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Colombia match banner */}
      {FEATURES.colombiaHighlight && colombiaMatch && (
        <div className="colombia-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🇨🇴 Colombia juega pronto</p>
              <p className="font-medium mt-1">
                {colombiaMatch.home_team} vs {colombiaMatch.away_team}
              </p>
            </div>
            <Link href={`/picks/${colombiaMatch.id}`} className="btn-primary text-sm rounded-lg px-4 py-2">
              Mi pick →
            </Link>
          </div>
        </div>
      )}

      {/* Next match countdown */}
      {nextMatch && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {nextMatch.status === 'live' ? '🔴 En vivo' : 'Próximo partido'}
            </p>
            {nextMatch.status === 'live' && (
              <Link href={`/match/${nextMatch.id}`} className="text-xs text-[#0a4a2e] font-semibold underline hover:no-underline">
                Ver picks →
              </Link>
            )}
          </div>
          <div className="flex items-center justify-between gap-4">
            {/* Home team */}
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {nextMatch.home_team_logo && (
                <Image src={nextMatch.home_team_logo} alt={nextMatch.home_team} width={40} height={40} className="object-contain" />
              )}
              <p className="font-semibold text-sm text-center truncate w-full">{nextMatch.home_team}</p>
            </div>

            {/* Center: pick + countdown */}
            <div className="flex flex-col items-center justify-center flex-none gap-1">
              {myNextPick ? (
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-display text-[#0a4a2e]">
                    {myNextPick.home_pick} – {myNextPick.away_pick}
                  </span>
                  {myNextPick.is_auto_assigned && (
                    <span className="badge-auto text-xs">Auto</span>
                  )}
                </div>
              ) : (
                <Link href={`/picks/${nextMatch.id}`} className="text-xs text-[#0a4a2e] font-semibold underline">
                  Sin pick
                </Link>
              )}
              <Countdown
                targetDate={new Date(new Date(nextMatch.kickoff_utc).getTime() - PICK_LOCK_MINUTES * 60 * 1000).toISOString()}
                label="Picks cierran en"
                className="text-sm text-gray-500 items-center text-center justify-center"
              />
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {nextMatch.away_team_logo && (
                <Image src={nextMatch.away_team_logo} alt={nextMatch.away_team} width={40} height={40} className="object-contain" />
              )}
              <p className="font-semibold text-sm text-center truncate w-full">{nextMatch.away_team}</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard top 10 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-[#0a4a2e]">Tabla de posiciones</h2>
          <Link href="/standings" className="text-sm text-[#0a4a2e] font-semibold hover:underline">
            Ver completa →
          </Link>
        </div>
        {leaderboard && (
          <LeaderboardTable
            rows={leaderboard}
            currentUserId={user.id}
            compact
          />
        )}
      </div>
    </div>
  );
}
