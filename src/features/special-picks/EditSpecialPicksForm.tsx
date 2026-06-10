'use client';

import { useState, useTransition } from 'react';
import { updateSpecialPicksAction } from '@/features/special-picks/actions';
import { WC2026_TEAMS, COLOMBIA_ELIMINATION_PHASES, WC2026_COLOMBIA_SQUAD } from '@/lib/config';

interface CurrentPicks {
  champion:    string;
  runner_up:   string;
  top_scorer:  string;
  golden_ball: string;
  third_place:               string | null;
  fourth_place:              string | null;
  golden_glove:              string | null;
  colombia_eliminated_phase: string | null;
  colombia_top_scorer:       string | null;
}

export default function EditSpecialPicksForm({ initialPicks }: { initialPicks: CurrentPicks }) {
  const [isEditing, setIsEditing]   = useState(false);
  const [champion, setChampion]     = useState(initialPicks.champion);
  const [runnerUp, setRunnerUp]     = useState(initialPicks.runner_up);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);
  const [pending, startTransition]  = useTransition();

  const availableForRunnerUp = WC2026_TEAMS.filter((t) => t !== champion);

  function handleChampionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setChampion(val);
    if (val === runnerUp) setRunnerUp('');
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSpecialPicksAction(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setIsEditing(false);
      }
    });
  }

  function handleCancel() {
    setIsEditing(false);
    setError(null);
    setChampion(initialPicks.champion);
    setRunnerUp(initialPicks.runner_up);
  }

  const sel = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:border-[#0a4a2e] focus:outline-none transition-colors';
  const inp = sel;

  if (!isEditing) {
    return (
      <div className="mt-4">
        {success && (
          <p className="text-green-600 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
            Picks actualizados correctamente.
          </p>
        )}
        <button
          onClick={() => { setIsEditing(true); setSuccess(false); }}
          className="btn-ghost w-full rounded-lg py-2.5 text-sm"
        >
          ✏️ Editar picks especiales
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
      <p className="text-sm font-semibold text-gray-700">Editar picks especiales</p>

      {/* 1. Champion */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          🏆 Campeón <span className="text-[#0a4a2e] font-bold">+20 pts</span>
        </label>
        <select name="champion" required value={champion} onChange={handleChampionChange} className={sel}>
          <option value="">Selecciona un equipo...</option>
          {WC2026_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* 2. Runner-up */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          🥈 Subcampeón <span className="text-[#0a4a2e] font-bold">+10 pts</span>
        </label>
        <select
          name="runner_up"
          required
          value={runnerUp}
          onChange={(e) => setRunnerUp(e.target.value)}
          disabled={!champion}
          className={`${sel} disabled:opacity-50`}
        >
          <option value="">{champion ? 'Selecciona un equipo...' : 'Primero selecciona el campeón'}</option>
          {availableForRunnerUp.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* 3. Third place */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          🥉 Tercer puesto <span className="text-[#0a4a2e] font-bold">+5 pts</span>
        </label>
        <select name="third_place" defaultValue={initialPicks.third_place ?? ''} className={sel}>
          <option value="">Selecciona un equipo...</option>
          {WC2026_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* 4. Fourth place */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          4️⃣ Cuarto puesto <span className="text-[#0a4a2e] font-bold">+5 pts</span>
        </label>
        <select name="fourth_place" defaultValue={initialPicks.fourth_place ?? ''} className={sel}>
          <option value="">Selecciona un equipo...</option>
          {WC2026_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* 5. Top scorer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          👟 Goleador del torneo <span className="text-[#0a4a2e] font-bold">+10 pts</span>
        </label>
        <input
          type="text" name="top_scorer" required minLength={2} maxLength={100}
          defaultValue={initialPicks.top_scorer} className={inp} placeholder="Nombre del jugador"
        />
      </div>

      {/* 6. Golden ball */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ⭐ Balón de Oro <span className="text-[#0a4a2e] font-bold">+5 pts</span>
        </label>
        <input
          type="text" name="golden_ball" required minLength={2} maxLength={100}
          defaultValue={initialPicks.golden_ball} className={inp} placeholder="Nombre del jugador"
        />
      </div>

      {/* 7. Golden glove */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          🧤 Guante de Oro <span className="text-[#0a4a2e] font-bold">+5 pts</span>
        </label>
        <input
          type="text" name="golden_glove" minLength={2} maxLength={100}
          defaultValue={initialPicks.golden_glove ?? ''} className={inp} placeholder="Nombre del portero"
        />
      </div>

      {/* 8. Colombia elimination phase */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          🇨🇴 Fase eliminación Colombia <span className="text-[#0a4a2e] font-bold">+10 pts</span>
        </label>
        <select name="colombia_eliminated_phase" defaultValue={initialPicks.colombia_eliminated_phase ?? ''} className={sel}>
          <option value="">Selecciona una fase...</option>
          {COLOMBIA_ELIMINATION_PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* 9. Colombia top scorer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ⚽ Goleador de Colombia <span className="text-[#0a4a2e] font-bold">+8 pts</span>
        </label>
        <select name="colombia_top_scorer" defaultValue={initialPicks.colombia_top_scorer ?? ''} className={sel}>
          <option value="">Selecciona un jugador...</option>
          {WC2026_COLOMBIA_SQUAD.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={handleCancel} className="btn-ghost rounded-lg py-2.5 px-4 flex-none">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="btn-primary flex-1 rounded-lg py-2.5">
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
