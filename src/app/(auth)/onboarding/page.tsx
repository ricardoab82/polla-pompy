'use client';

import { useState, useTransition } from 'react';
import { submitSpecialPicksAction, updateDisplayNameAction } from '@/features/special-picks/actions';
import { WC2026_TEAMS, COLOMBIA_ELIMINATION_PHASES } from '@/lib/config';

export default function OnboardingPage() {
  const [step, setStep]                  = useState<1 | 2>(1);
  const [displayName, setDisplayName]    = useState('');
  const [champion, setChampion]          = useState('');
  const [error, setError]                = useState<string | null>(null);
  const [pending, startTransition]       = useTransition();

  function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateDisplayNameAction(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setStep(2);
      }
    });
  }

  function handlePicksSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitSpecialPicksAction(fd);
      if (result?.error) setError(result.error);
      // On success, middleware redirect to /dashboard kicks in
    });
  }

  const availableForRunnerUp = WC2026_TEAMS.filter((t) => t !== champion);

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-[#0a4a2e]">¡Bienvenido!</h1>
          <p className="text-gray-500 mt-1">Completa tu perfil para comenzar</p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step >= 1 ? 'bg-[#0a4a2e] text-[#f5c842]' : 'bg-gray-200 text-gray-400'}`}>
              1
            </div>
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-[#0a4a2e]' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step >= 2 ? 'bg-[#0a4a2e] text-[#f5c842]' : 'bg-gray-200 text-gray-400'}`}>
              2
            </div>
          </div>
        </div>

        <div className="card">
          {step === 1 && (
            <form onSubmit={handleNameSubmit} className="space-y-5">
              <div>
                <h2 className="font-display text-2xl text-[#0a4a2e] mb-1">Tu nombre</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Así te verán los demás participantes en la tabla.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  name="display_name"
                  required
                  minLength={2}
                  maxLength={50}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors"
                  placeholder="Tu nombre o apodo"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={pending || !displayName.trim()} className="btn-primary w-full rounded-lg py-3">
                {pending ? 'Guardando...' : 'Continuar →'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handlePicksSubmit} className="space-y-5">
              <div>
                <h2 className="font-display text-2xl text-[#0a4a2e] mb-1">Picks Especiales</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Estos picks solo se pueden enviar antes del 10 de junio. ¡Son los que más puntos valen!
                </p>
              </div>

              {/* Champion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🏆 Campeón <span className="text-[#0a4a2e] font-bold">+20 pts</span>
                </label>
                <select
                  name="champion"
                  required
                  value={champion}
                  onChange={(e) => setChampion(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors"
                >
                  <option value="">Selecciona un equipo...</option>
                  {WC2026_TEAMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Runner-up */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🥈 Subcampeón <span className="text-[#0a4a2e] font-bold">+10 pts</span>
                </label>
                <select
                  name="runner_up"
                  required
                  disabled={!champion}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors
                             disabled:opacity-50"
                >
                  <option value="">
                    {champion ? 'Selecciona un equipo...' : 'Primero selecciona el campeón'}
                  </option>
                  {availableForRunnerUp.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Top scorer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  👟 Goleador del torneo <span className="text-[#0a4a2e] font-bold">+10 pts</span>
                </label>
                <input
                  type="text"
                  name="top_scorer"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors"
                  placeholder="Nombre del jugador"
                />
              </div>

              {/* Golden ball */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ⭐ Balón de Oro <span className="text-[#0a4a2e] font-bold">+5 pts</span>
                </label>
                <input
                  type="text"
                  name="golden_ball"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors"
                  placeholder="Nombre del jugador"
                />
              </div>

              {/* Golden glove */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🧤 Guante de Oro <span className="text-[#0a4a2e] font-bold">+5 pts</span>
                </label>
                <input
                  type="text"
                  name="golden_glove"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors"
                  placeholder="Nombre del portero"
                />
              </div>

              {/* Best defense */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🛡️ Menos goles en contra <span className="text-[#0a4a2e] font-bold">+5 pts</span>
                </label>
                <select
                  name="best_defense"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors"
                  defaultValue=""
                >
                  <option value="">Selecciona un equipo...</option>
                  {WC2026_TEAMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Colombia elimination phase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🇨🇴 Fase eliminación Colombia <span className="text-[#0a4a2e] font-bold">+10 pts</span>
                </label>
                <select
                  name="colombia_eliminated_phase"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors"
                  defaultValue=""
                >
                  <option value="">Selecciona una fase...</option>
                  {COLOMBIA_ELIMINATION_PHASES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Colombia top scorer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ⚽ Goleador de Colombia <span className="text-[#0a4a2e] font-bold">+8 pts</span>
                </label>
                <input
                  type="text"
                  name="colombia_top_scorer"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5
                             focus:border-[#0a4a2e] focus:outline-none transition-colors"
                  placeholder="Nombre del jugador"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost rounded-lg py-3 px-4 flex-none"
                >
                  ← Atrás
                </button>
                <button type="submit" disabled={pending} className="btn-primary flex-1 rounded-lg py-3">
                  {pending ? 'Guardando...' : 'Enviar y comenzar 🚀'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
