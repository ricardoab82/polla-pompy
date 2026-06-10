import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import { logoutAction } from '@/features/auth/actions';
import { REGISTRATION_DEADLINE } from '@/lib/config';
import EditSpecialPicksForm from '@/features/special-picks/EditSpecialPicksForm';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: myRank } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: specialPicks } = await supabase
    .from('special_picks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) redirect('/login');

  const deadlinePassed = new Date() > REGISTRATION_DEADLINE;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Profile header */}
      <div className="card flex items-center gap-4">
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl text-[#0a4a2e] truncate">{profile.display_name}</h1>
          <p className="text-gray-400 text-sm">{profile.email}</p>
          <p className="text-xs text-gray-400 mt-1 capitalize">
            {profile.auth_provider === 'google' ? '🔵 Google' : '📧 Email'} ·{' '}
            {profile.role === 'admin' ? '👑 Admin' :
             profile.role === 'co-admin' ? '⭐ Co-admin' : '👤 Participante'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Posición',   value: `#${myRank?.rank ?? '—'}` },
          { label: 'Puntos',     value: myRank?.total_points ?? 0 },
          { label: 'Exactos',    value: String(myRank?.exact_results_count ?? 0) },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="font-display text-3xl text-[#0a4a2e]">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Puntos grupos',    value: myRank?.group_pts    ?? 0 },
          { label: 'Eliminat.',        value: myRank?.knockout_pts ?? 0 },
          { label: 'Bonus + Especial', value: (myRank?.bonus_pts ?? 0) + (myRank?.special_pts ?? 0) },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="font-display text-3xl text-[#0a4a2e]">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Special picks */}
      {specialPicks && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-[#0a4a2e]">Picks especiales</h2>
            {deadlinePassed && (
              <span className="text-xs font-semibold bg-gray-100 text-gray-500 rounded-full px-3 py-1">
                Plazo cerrado
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: '🏆 Campeón',              value: specialPicks.champion,                  pts: specialPicks.champion_pts            ?? null, max: 20 },
              { label: '🥈 Subcampeón',            value: specialPicks.runner_up,                 pts: specialPicks.runner_up_pts           ?? null, max: 10 },
              { label: '🥉 Tercer puesto',          value: specialPicks.third_place,               pts: specialPicks.third_place_pts         ?? null, max: 5  },
              { label: '4️⃣ Cuarto puesto',         value: specialPicks.fourth_place,              pts: specialPicks.fourth_place_pts        ?? null, max: 5  },
              { label: '👟 Goleador',              value: specialPicks.top_scorer,                pts: specialPicks.top_scorer_pts          ?? null, max: 10 },
              { label: '⭐ Balón de Oro',           value: specialPicks.golden_ball,               pts: specialPicks.golden_ball_pts         ?? null, max: 5  },
              { label: '🧤 Guante de Oro',          value: specialPicks.golden_glove,              pts: specialPicks.golden_glove_pts        ?? null, max: 5  },
              { label: '🇨🇴 Eliminación Colombia', value: specialPicks.colombia_eliminated_phase, pts: specialPicks.colombia_eliminated_pts ?? null, max: 10 },
              { label: '⚽ Goleador Colombia',      value: specialPicks.colombia_top_scorer,       pts: specialPicks.colombia_top_scorer_pts ?? null, max: 8  },
            ].filter((item) => item.value).map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="font-semibold truncate">{item.value}</p>
                {item.pts !== null && (
                  <p className={`text-xs font-bold mt-1 ${item.pts > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {item.pts} / {item.max} pts
                  </p>
                )}
              </div>
            ))}
          </div>
          {!deadlinePassed && (
            <EditSpecialPicksForm
              initialPicks={{
                champion:                  specialPicks.champion,
                runner_up:                 specialPicks.runner_up,
                top_scorer:                specialPicks.top_scorer,
                golden_ball:               specialPicks.golden_ball,
                third_place:               specialPicks.third_place,
                fourth_place:              specialPicks.fourth_place,
                golden_glove:              specialPicks.golden_glove,
                colombia_eliminated_phase: specialPicks.colombia_eliminated_phase,
                colombia_top_scorer:       specialPicks.colombia_top_scorer,
              }}
            />
          )}
        </div>
      )}

      {/* Logout */}
      <form action={logoutAction}>
        <button type="submit" className="btn-ghost w-full rounded-lg py-3">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
