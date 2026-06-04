import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Image from 'next/image';
import Avatar from '@/components/ui/Avatar';

const PHASE_LABELS: Record<string, string> = {
  group: 'Fase de grupos', round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos', quarterfinal: 'Cuartos',
  semifinal: 'Semifinal', final: 'Final',
};

function formatKickoff(utc: string): string {
  return new Date(utc).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function MatchDetailPage({
  params,
}: {
  params: { match_id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', params.match_id)
    .single();

  if (!match) notFound();

  const isPostKickoff = match.status !== 'scheduled';

  // Fetch picks (own always; others only post-kickoff)
  const { data: picks } = await supabase
    .from('picks')
    .select('user_id, home_pick, away_pick, is_auto_assigned, points_earned')
    .eq('match_id', match.id);

  // Fetch users for display
  const userIds = Array.from(new Set(picks?.map((p) => p.user_id) ?? []));
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

  // Bonus questions
  const { data: questions } = await supabase
    .from('bonus_questions')
    .select('*')
    .eq('match_id', match.id)
    .order('created_at');

  const { data: allAnswers } = isPostKickoff && questions?.length
    ? await supabase
        .from('bonus_answers')
        .select('question_id, user_id, answer, is_correct, points_earned')
        .in('question_id', questions.map((q) => q.id))
    : { data: null };

  // Sort picks: my pick first, then by points desc
  const sortedPicks = [...(picks ?? [])].sort((a, b) => {
    if (a.user_id === user.id) return -1;
    if (b.user_id === user.id) return 1;
    return (b.points_earned ?? -1) - (a.points_earned ?? -1);
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Match header */}
      <div className={`card ${match.is_colombia_match ? 'colombia-border' : ''}`}>
        <p className="text-xs text-gray-500 text-center mb-3 uppercase tracking-wide">
          {PHASE_LABELS[match.phase] ?? match.phase}
          {match.group_name ? ` · ${match.group_name}` : ''}
          {' · '}{formatKickoff(match.kickoff_utc)}
        </p>
        <div className="flex items-center gap-4 justify-between">
          <div className="flex flex-col items-center gap-1 flex-1">
            {match.home_team_logo && (
              <Image src={match.home_team_logo} alt={match.home_team} width={56} height={56} className="object-contain" />
            )}
            <p className="font-semibold text-center">{match.home_team}</p>
          </div>
          <div className="text-center flex-none">
            {match.status === 'finished' && match.home_score !== null ? (
              <div className="font-display text-5xl text-[#0a4a2e]">
                {match.home_score} – {match.away_score}
              </div>
            ) : match.status === 'live' ? (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold text-green-600">EN VIVO</span>
              </div>
            ) : (
              <span className="text-gray-400 text-sm">vs</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 flex-1">
            {match.away_team_logo && (
              <Image src={match.away_team_logo} alt={match.away_team} width={56} height={56} className="object-contain" />
            )}
            <p className="font-semibold text-center">{match.away_team}</p>
          </div>
        </div>
      </div>

      {/* Picks table */}
      <div className="card">
        <h2 className="font-display text-2xl text-[#0a4a2e] mb-4">
          {isPostKickoff ? 'Picks de todos' : 'Mi pick'}
        </h2>

        {sortedPicks.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nadie ha ingresado picks aún.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {sortedPicks
              .filter((p) => isPostKickoff || p.user_id === user.id)
              .map((pick) => {
                const u         = userMap.get(pick.user_id);
                const isMe      = pick.user_id === user.id;
                const ptColor   = pick.points_earned == null ? '' :
                                  pick.points_earned > 0 ? 'text-green-600' : 'text-red-500';
                const isExact   = match.home_score !== null &&
                                  pick.home_pick === match.home_score &&
                                  pick.away_pick === match.away_score;

                return (
                  <div
                    key={pick.user_id}
                    className={`flex items-center justify-between py-2.5
                                ${isMe ? 'bg-[#e8f5e9] -mx-4 px-4 rounded-lg' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {u && <Avatar displayName={u.display_name} avatarUrl={u.avatar_url} size={28} />}
                      <span className="text-sm font-medium">
                        {u?.display_name ?? '—'}
                        {isMe && <span className="text-xs text-gray-400 ml-1">(tú)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-display text-lg ${ptColor || 'text-gray-700'}`}>
                        {pick.home_pick}–{pick.away_pick}
                      </span>
                      {pick.is_auto_assigned && <span className="badge-auto">Auto</span>}
                      {isExact && (
                        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                          Exacto ✓
                        </span>
                      )}
                      {match.status === 'finished' && pick.points_earned !== null && (
                        <span className={`text-sm font-bold ${ptColor}`}>
                          {pick.points_earned > 0 ? `+${pick.points_earned}` : pick.points_earned} pts
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Bonus section */}
      {questions && questions.length > 0 && (
        <div className="card space-y-4">
          <h2 className="font-display text-2xl text-[#0a4a2e]">Bonus</h2>
          {questions.map((q) => {
            const answers = allAnswers?.filter((a) => a.question_id === q.id) ?? [];
            return (
              <div key={q.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <p className="font-medium">{q.question_text}</p>
                  <span className="text-xs font-bold text-[#0a4a2e] bg-[#e8f5e9] px-2 py-0.5 rounded-full flex-none">
                    +{q.points_value} pts
                  </span>
                </div>
                {q.correct_answer && (
                  <p className="text-sm text-gray-500 mb-2">
                    Respuesta correcta: <strong className="text-[#0a4a2e]">{q.correct_answer}</strong>
                  </p>
                )}
                {isPostKickoff && answers.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {answers.map((ans) => {
                      const u = userMap.get(ans.user_id);
                      return (
                        <div key={ans.user_id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            {u && <Avatar displayName={u.display_name} avatarUrl={u.avatar_url} size={22} />}
                            <span className="text-sm">{u?.display_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{ans.answer}</span>
                            {ans.is_correct === true && (
                              <span className="text-green-500 text-xs font-bold">✓ +{ans.points_earned} pts</span>
                            )}
                            {ans.is_correct === false && (
                              <span className="text-red-400 text-xs">✗</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
