import { requireAdmin } from '@/lib/auth-helpers';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const [
    { count: totalUsers },
    { data: apiUsage },
    { data: todayMatches },
    { count: pendingBonus },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('daily_api_usage').select('call_count').eq('date', today).single(),
    supabase.from('matches').select('id').gte('kickoff_utc', `${today}T00:00:00Z`).lte('kickoff_utc', `${today}T23:59:59Z`).not('status', 'eq', 'cancelled'),
    supabase.from('bonus_questions').select('*', { count: 'exact', head: true }).is('correct_answer', null).not('answered_at', 'is', null),
  ]);

  const apiCount  = apiUsage?.call_count ?? 0;
  const apiPct    = Math.round((apiCount / 100) * 100);
  const apiColor  = apiCount >= 95 ? 'bg-red-500' : apiCount >= 80 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="font-display text-4xl text-[#0a4a2e]">Panel Admin</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Participantes activos', value: totalUsers ?? 0, icon: '👥' },
          { label: 'Partidos hoy',          value: todayMatches?.length ?? 0, icon: '⚽' },
          { label: 'Bonus pendientes',      value: pendingBonus ?? 0, icon: '❓' },
          { label: 'API calls hoy',         value: `${apiCount}/100`, icon: '📡' },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="font-display text-3xl text-[#0a4a2e]">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* API usage bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Uso de API-Football (hoy)</p>
          <p className="text-sm font-bold text-gray-600">{apiCount} / 100</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${apiColor}`}
            style={{ width: `${Math.min(apiPct, 100)}%` }}
          />
        </div>
        {apiCount >= 95 && (
          <p className="text-red-600 text-xs mt-2 font-semibold">⛔ Polling detenido para conservar llamadas.</p>
        )}
        {apiCount >= 80 && apiCount < 95 && (
          <p className="text-amber-600 text-xs mt-2">⚠️ Polling reducido a cada 15 minutos.</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { href: '/admin/matches',       label: 'Gestionar partidos',    icon: '⚽', desc: 'Resultados, sincronización, recalcular puntos' },
          { href: '/admin/bonus',         label: 'Preguntas bonus',       icon: '❓', desc: 'Crear, responder y calificar preguntas' },
          { href: '/admin/users',         label: 'Usuarios',              icon: '👥', desc: 'Roles, activar/desactivar cuentas' },
          { href: '/admin/special-picks', label: 'Picks especiales',      icon: '🏆', desc: 'Ver y calificar picks pre-torneo' },
          { href: '/admin/settings',      label: 'Configuración',         icon: '⚙️', desc: 'Registro, fase, recalcular todo' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-[#0a4a2e]">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
