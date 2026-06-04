import { requireAdmin } from '@/lib/auth-helpers';
import { recalculateAllPointsAction } from '@/features/admin/actions';
import { formAction } from '@/lib/form-action';

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
        <h1 className="font-display text-4xl text-[#0a4a2e]">Configuración</h1>
      </div>

      {/* API cron info */}
      <div className="card">
        <h2 className="font-semibold mb-2">Cron Jobs</h2>
        <div className="space-y-2 text-sm text-gray-600">
          {[
            { path: '/api/cron/sync-fixtures', schedule: 'Diario 03:00 UTC',  desc: 'Sincroniza todos los partidos desde API-Football' },
            { path: '/api/cron/poll-live',     schedule: 'Cada 5 min',        desc: 'Actualiza scores de partidos en vivo' },
            { path: '/api/cron/lock-picks',    schedule: 'Cada 15 min',       desc: 'Cierra picks y asigna automáticos' },
            { path: '/api/cron/reminders',     schedule: 'Cada hora',         desc: 'Envía recordatorios 2h antes del cierre' },
          ].map((cron) => (
            <div key={cron.path} className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-mono text-xs text-[#0a4a2e]">{cron.path}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cron.desc}</p>
              </div>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono flex-none">
                {cron.schedule}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border-red-200">
        <h2 className="font-semibold text-red-700 mb-2">⚠️ Zona peligrosa</h2>
        <p className="text-sm text-gray-500 mb-4">
          Recalcula todos los puntos desde cero para todos los partidos finalizados.
          Esta operación es idempotente y segura, pero puede tardar varios minutos.
        </p>
        <form action={formAction(recalculateAllPointsAction)}>
          <button
            type="submit"
            className="text-sm bg-red-600 text-white px-6 py-2.5 rounded-lg font-semibold
                       hover:bg-red-700 transition-colors"
          >
            Recalcular TODOS los puntos
          </button>
        </form>
      </div>
    </div>
  );
}
