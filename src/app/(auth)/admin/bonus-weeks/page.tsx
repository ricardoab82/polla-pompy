import { requireAdmin } from '@/lib/auth-helpers';
import { closeBonusWeekAction, assignSponsorPrizeAction } from '@/features/admin/actions';
import { formAction } from '@/lib/form-action';

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekBounds(weekNum: number, year: number): { start: string; end: string } {
  // ISO week: Monday start
  const simple = new Date(year, 0, 1 + (weekNum - 1) * 7);
  const dow = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - (dow <= 4 ? dow - 1 : dow - 8));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end:   sunday.toISOString().split('T')[0],
  };
}

export default async function AdminBonusWeeksPage() {
  const { supabase } = await requireAdmin();

  const now = new Date();
  const currentWeek = getISOWeek(now);
  const { start, end } = getWeekBounds(currentWeek, now.getFullYear());

  // Get closed weeks
  const { data: closedWeeks } = await supabase
    .from('bonus_weekly_standings')
    .select('week_number, week_start, week_end, finalized, sponsor_prize')
    .eq('finalized', true)
    .order('week_number', { ascending: false });

  const closedWeekNums = new Set(closedWeeks?.map((w) => w.week_number) ?? []);
  const currentWeekClosed = closedWeekNums.has(currentWeek);

  // Unique weeks for the closed list
  const uniqueWeeks = Array.from(
    new Map(closedWeeks?.map((w) => [w.week_number, w]) ?? []).values()
  );

  // Count open bonus answers (current week activity)
  const { count: openAnswerCount } = await supabase
    .from('bonus_answers')
    .select('*', { count: 'exact', head: true })
    .is('week_number', null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
        <h1 className="font-display text-4xl text-[#0a4a2e]">Semanas Bonus</h1>
      </div>

      {/* Current week */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-lg">Semana {currentWeek} (actual)</h2>
            <p className="text-xs text-gray-400">{start} → {end}</p>
            <p className="text-sm text-gray-600 mt-1">
              {openAnswerCount ?? 0} respuestas bonus sin asignar a semana
            </p>
          </div>
          {currentWeekClosed ? (
            <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
              ✓ Cerrada
            </span>
          ) : (
            <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium">
              Activa
            </span>
          )}
        </div>

        {!currentWeekClosed && (
          <form action={formAction(closeBonusWeekAction)} className="space-y-3">
            <input type="hidden" name="week_number" value={currentWeek} />
            <input type="hidden" name="week_start"  value={start} />
            <input type="hidden" name="week_end"    value={end} />
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ Cerrar semana</p>
              <p>Esto toma una foto de todos los puntos bonus actuales, asigna rankings y reinicia el contador para la próxima semana.</p>
            </div>
            <button type="submit" className="btn-primary rounded-xl py-2.5 px-6">
              Cerrar semana {currentWeek}
            </button>
          </form>
        )}
      </div>

      {/* Closed weeks */}
      {uniqueWeeks.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl text-gray-700">Semanas cerradas</h2>
          {uniqueWeeks.map((week) => (
            <div key={week.week_number} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Semana {week.week_number}</p>
                  <p className="text-xs text-gray-400">{week.week_start} → {week.week_end}</p>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Cerrada</span>
              </div>

              <form action={formAction(assignSponsorPrizeAction)} className="flex gap-2">
                <input type="hidden" name="week_number" value={week.week_number} />
                <input
                  type="text"
                  name="sponsor_prize"
                  defaultValue={week.sponsor_prize ?? ''}
                  placeholder="Premio del patrocinador..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                             focus:border-[#0a4a2e] focus:outline-none"
                />
                <button type="submit" className="btn-secondary text-sm rounded-lg px-4 py-2 flex-none">
                  Guardar premio
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {uniqueWeeks.length === 0 && (
        <p className="text-center text-gray-400 py-6">No hay semanas cerradas aún.</p>
      )}
    </div>
  );
}
