import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';

export default async function StandingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: leaderboard } = await supabase
    .from('leaderboard')
    .select('*')
    .order('rank');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-4xl text-[#0a4a2e]">Tabla de posiciones</h1>

      <div className="card">
        {leaderboard?.length ? (
          <LeaderboardTable rows={leaderboard} currentUserId={user.id} />
        ) : (
          <p className="text-center py-8 text-gray-400">
            La tabla se actualizará cuando comiencen los partidos.
          </p>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Desempate: mayor cantidad de resultados exactos. Si sigue empatado, el premio se divide.
      </p>
    </div>
  );
}
