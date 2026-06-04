import { requireAdmin } from '@/lib/auth-helpers';
import { gradeSpecialPicksAction } from '@/features/admin/actions';
import { formAction } from '@/lib/form-action';

export default async function AdminSpecialPicksPage() {
  const { supabase } = await requireAdmin();

  const { data: specialPicks } = await supabase
    .from('special_picks')
    .select('*, users(display_name, avatar_url)');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
        <h1 className="font-display text-4xl text-[#0a4a2e]">Picks especiales</h1>
      </div>

      {/* Grade form */}
      <div className="card">
        <h2 className="font-semibold mb-4">Resultados finales del torneo</h2>
        <form action={formAction(gradeSpecialPicksAction)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: 'champion',    label: '🏆 Campeón (+20 pts)' },
              { name: 'runner_up',   label: '🥈 Subcampeón (+10 pts)' },
              { name: 'top_scorer',  label: '👟 Goleador (+10 pts)' },
              { name: 'golden_ball', label: '⭐ Balón de Oro (+5 pts)' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type="text"
                  name={field.name}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                             focus:border-[#0a4a2e] focus:outline-none"
                  placeholder="Nombre exacto..."
                />
              </div>
            ))}
          </div>
          <button type="submit" className="btn-primary rounded-lg py-3 px-6">
            Calcular puntos especiales
          </button>
        </form>
      </div>

      {/* All picks table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase">
              <th className="py-2 px-2 text-left">Jugador</th>
              <th className="py-2 px-2 text-left">Campeón</th>
              <th className="py-2 px-2 text-left hidden md:table-cell">Subcampeón</th>
              <th className="py-2 px-2 text-left hidden lg:table-cell">Goleador</th>
              <th className="py-2 px-2 text-left hidden lg:table-cell">Balón de Oro</th>
              <th className="py-2 px-2 text-right">Total pts</th>
            </tr>
          </thead>
          <tbody>
            {specialPicks?.map((sp) => {
              const u = sp.users as { display_name: string } | null;
              return (
                <tr key={sp.id} className="border-b border-gray-50">
                  <td className="py-3 px-2 font-medium">{u?.display_name ?? '—'}</td>
                  <td className="py-3 px-2">
                    {sp.champion}
                    {sp.champion_pts !== null && (
                      <span className={`ml-1 text-xs ${sp.champion_pts > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        (+{sp.champion_pts})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 hidden md:table-cell">{sp.runner_up}</td>
                  <td className="py-3 px-2 hidden lg:table-cell">{sp.top_scorer}</td>
                  <td className="py-3 px-2 hidden lg:table-cell">{sp.golden_ball}</td>
                  <td className="py-3 px-2 text-right font-bold text-[#0a4a2e]">
                    {sp.total_special_pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
