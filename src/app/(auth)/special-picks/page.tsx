import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SPECIAL_PICKS_REVEAL } from '@/lib/config';
import SpecialPicksCountdown from '@/components/special-picks/SpecialPicksCountdown';

const FIELDS = [
  { key: 'champion',                  label: '🏆 Campeón',              pts: 'champion_pts',            max: 20 },
  { key: 'runner_up',                 label: '🥈 Subcampeón',            pts: 'runner_up_pts',           max: 10 },
  { key: 'third_place',               label: '🥉 3er puesto',            pts: 'third_place_pts',         max: 5  },
  { key: 'fourth_place',              label: '4️⃣ 4to puesto',           pts: 'fourth_place_pts',        max: 5  },
  { key: 'top_scorer',                label: '👟 Goleador',              pts: 'top_scorer_pts',          max: 10 },
  { key: 'golden_ball',               label: '⭐ Balón de Oro',          pts: 'golden_ball_pts',         max: 5  },
  { key: 'golden_glove',              label: '🧤 Guante de Oro',         pts: 'golden_glove_pts',        max: 5  },
  { key: 'colombia_eliminated_phase', label: '🇨🇴 Eliminación Colombia', pts: 'colombia_eliminated_pts', max: 10 },
  { key: 'colombia_top_scorer',       label: '⚽ Goleador Colombia',     pts: 'colombia_top_scorer_pts', max: 8  },
] as const;

export default async function SpecialPicksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const revealed = new Date() >= SPECIAL_PICKS_REVEAL;

  // Always fetch current user's own picks
  const { data: myPicks } = await supabase
    .from('special_picks')
    .select('*, users(display_name)')
    .eq('user_id', user.id)
    .maybeSingle();

  // Only fetch all picks after reveal
  let allPicks: typeof myPicks[] = [];
  if (revealed) {
    const { data } = await supabase
      .from('special_picks')
      .select('*, users(display_name)')
      .order('total_special_pts', { ascending: false });
    allPicks = data ?? [];
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-4xl text-[#0a4a2e]">Picks Especiales</h1>

      {!revealed ? (
        <>
          {/* Countdown */}
          <div className="card text-center py-8">
            <p className="text-2xl mb-1">🔒</p>
            <p className="font-semibold text-gray-700 text-lg">Los picks se revelan cuando empiece el torneo</p>
            <p className="text-sm text-gray-400 mt-1">
              11 jun · 14:00 hora Colombia
            </p>
            <SpecialPicksCountdown revealAt={SPECIAL_PICKS_REVEAL.toISOString()} />
          </div>

          {/* Current user's own picks preview */}
          {myPicks ? (
            <div className="card">
              <h2 className="font-semibold text-[#0a4a2e] mb-4">Tus picks especiales</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FIELDS.filter((f) => myPicks[f.key as keyof typeof myPicks]).map((f) => (
                  <div key={f.key} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">{f.label}</p>
                    <p className="font-semibold text-sm truncate">
                      {String(myPicks[f.key as keyof typeof myPicks] ?? '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center py-6 text-gray-500 text-sm">
              Aún no has ingresado tus picks especiales.{' '}
              <a href="/profile" className="text-[#0a4a2e] underline">Ir a mi perfil</a>
            </div>
          )}
        </>
      ) : (
        /* ── Revealed: full table ── */
        <div className="card overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase">
                <th className="py-2 px-2 text-left sticky left-0 bg-white">Participante</th>
                {FIELDS.map((f) => (
                  <th key={f.key} className="py-2 px-2 text-left whitespace-nowrap">{f.label}</th>
                ))}
                <th className="py-2 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {allPicks.map((sp) => {
                if (!sp) return null;
                const u = sp.users as { display_name: string } | null;
                const isMe = sp.user_id === user.id;
                return (
                  <tr
                    key={sp.id}
                    className={`border-b border-gray-50 ${isMe ? 'bg-green-50' : ''}`}
                  >
                    <td className={`py-3 px-2 font-medium sticky left-0 ${isMe ? 'bg-green-50' : 'bg-white'}`}>
                      {u?.display_name ?? '—'}
                      {isMe && <span className="ml-1 text-xs text-green-600">(tú)</span>}
                    </td>
                    {FIELDS.map((f) => {
                      const val = sp[f.key as keyof typeof sp];
                      const pts = sp[f.pts as keyof typeof sp] as number | null;
                      return (
                        <td key={f.key} className="py-3 px-2 whitespace-nowrap">
                          <span>{val ? String(val) : '—'}</span>
                          {pts !== null && pts !== undefined && (
                            <span className={`ml-1 text-xs font-bold ${pts > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              ({pts}/{f.max})
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-2 text-right font-bold text-[#0a4a2e]">
                      {sp.total_special_pts ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
