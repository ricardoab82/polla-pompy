'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { submitBulkPicksAction } from '@/features/picks/actions';
import { PICK_LOCK_MINUTES } from '@/lib/config';
import Countdown from '@/components/ui/Countdown';

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  kickoff_utc: string;
  phase: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  is_colombia_match: boolean;
}

interface Pick {
  match_id: string;
  home_pick: number;
  away_pick: number;
  is_auto_assigned: boolean;
  points_earned: number | null;
}

interface BonusCount {
  match_id: string;
  count: number;
}

interface Props {
  matches: Match[];
  picks: Pick[];
  bonusCounts: BonusCount[];
}

type PhaseLabel = {
  group: string; round_of_32: string; round_of_16: string;
  quarterfinal: string; semifinal: string; final: string;
  [key: string]: string;
};

const PHASE_ORDER = ['group', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'];
const PHASE_LABELS: PhaseLabel = {
  group: 'Fase de grupos', round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos de final', quarterfinal: 'Cuartos de final',
  semifinal: 'Semifinal', final: 'Gran Final',
};

function formatKickoff(utc: string) {
  return new Date(utc).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

type SaveStatus = 'saving' | 'saved' | 'error';

export default function BulkPicksList({ matches, picks, bonusCounts }: Props) {
  const pickMap   = new Map(picks.map((p) => [p.match_id, p]));
  const bonusMap  = new Map(bonusCounts.map((b) => [b.match_id, b.count]));

  const initInputs = () => {
    const init: Record<string, { home: string; away: string }> = {};
    for (const p of picks) {
      init[p.match_id] = { home: String(p.home_pick), away: String(p.away_pick) };
    }
    return init;
  };

  const [inputs,    setInputs]    = useState<Record<string, { home: string; away: string }>>(initInputs);
  const [lastSaved, setLastSaved] = useState<Record<string, { home: string; away: string }>>(initInputs);
  const [statuses,  setStatuses]  = useState<Record<string, SaveStatus>>({});
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  function setInput(matchId: string, field: 'home' | 'away', value: string) {
    setInputs((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: '', away: '' }), [field]: value },
    }));
    // Clear status while editing so the indicator disappears until blur
    setStatuses((prev) => { const n = { ...prev }; delete n[matchId]; return n; });
    setErrors((prev)   => { const n = { ...prev }; delete n[matchId]; return n; });
  }

  function handleBlur(matchId: string, home: string, away: string) {
    if (home === '' || away === '') return;

    // Skip if identical to last successful save
    const last = lastSaved[matchId];
    if (last && last.home === home && last.away === away) return;

    // Skip if a save is already in flight
    if (statuses[matchId] === 'saving') return;

    setStatuses((prev) => ({ ...prev, [matchId]: 'saving' }));

    startTransition(async () => {
      const result = await submitBulkPicksAction([
        { match_id: matchId, home_pick: Number(home), away_pick: Number(away) },
      ]);

      if (result.errors[matchId]) {
        setStatuses((prev) => ({ ...prev, [matchId]: 'error' }));
        setErrors((prev)   => ({ ...prev, [matchId]: result.errors[matchId] }));
      } else {
        setStatuses((prev)   => ({ ...prev, [matchId]: 'saved' }));
        setLastSaved((prev)  => ({ ...prev, [matchId]: { home, away } }));
      }
    });
  }

  const byPhase = new Map<string, Match[]>();
  for (const m of matches) {
    if (!byPhase.has(m.phase)) byPhase.set(m.phase, []);
    byPhase.get(m.phase)!.push(m);
  }

  if (!matches.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">⚽</p>
        <p>Los partidos aún no están disponibles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl text-[#0a4a2e]">Mis Picks</h1>

      {PHASE_ORDER.map((phase) => {
        const phaseMatches = byPhase.get(phase);
        if (!phaseMatches?.length) return null;

        return (
          <section key={phase}>
            <h2 className="font-display text-2xl text-gray-700 mb-3">{PHASE_LABELS[phase]}</h2>
            <div className="space-y-2">
              {phaseMatches.map((match) => {
                const lockTime     = new Date(new Date(match.kickoff_utc).getTime() - PICK_LOCK_MINUTES * 60 * 1000);
                const isLocked     = new Date() >= lockTime;
                const isLive       = match.status === 'live';
                const isFinished   = match.status === 'finished';
                const existingPick = pickMap.get(match.id);
                const inp          = inputs[match.id] ?? { home: '', away: '' };
                const status       = statuses[match.id];
                const bonusCount   = bonusMap.get(match.id) ?? 0;
                const pointsColor  =
                  existingPick?.points_earned == null ? '' :
                  existingPick.points_earned > 0 ? 'text-green-600' : 'text-red-500';

                return (
                  <div
                    key={match.id}
                    className={`card py-3 px-4 ${match.is_colombia_match ? 'colombia-border' : ''}
                                ${isLive            ? 'ring-2 ring-green-400' : ''}
                                ${status === 'saved' ? 'ring-1 ring-green-300' : ''}
                                ${status === 'error' ? 'ring-1 ring-red-300'   : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Home team */}
                      <div className="flex flex-col items-center gap-0.5 w-16 flex-none">
                        {match.home_team_logo && (
                          <Image src={match.home_team_logo} alt={match.home_team} width={28} height={28} className="object-contain" />
                        )}
                        <span className="text-xs font-medium text-center leading-tight line-clamp-2">
                          {match.home_team}
                        </span>
                      </div>

                      {/* Centre */}
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-xs text-gray-400">{formatKickoff(match.kickoff_utc)}</p>
                        {!isLocked && !isFinished && !isLive && (
                          <Countdown
                            targetDate={lockTime.toISOString()}
                            label="Cierra en"
                            className="text-xs text-gray-400 flex flex-col items-center"
                          />
                        )}

                        {isFinished && match.home_score !== null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-display text-xl text-[#0a4a2e]">
                              {match.home_score} – {match.away_score}
                            </span>
                            {existingPick && (
                              <span className={`text-sm font-display ${pointsColor}`}>
                                pick: {existingPick.home_pick}–{existingPick.away_pick}
                                {existingPick.points_earned !== null && (
                                  <span className="ml-1">
                                    ({existingPick.points_earned > 0 ? `+${existingPick.points_earned}` : existingPick.points_earned} pts)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        ) : isLocked ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs text-red-500 font-medium">🔒 Cerrado</span>
                            {existingPick && (
                              <span className="font-display text-lg text-gray-600">
                                {existingPick.home_pick}–{existingPick.away_pick}
                                {existingPick.is_auto_assigned && (
                                  <span className="badge-auto ml-1 text-xs">Auto</span>
                                )}
                              </span>
                            )}
                            {!existingPick && <span className="text-xs text-gray-400">Sin pick</span>}
                          </div>
                        ) : isLive ? (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-green-600 font-semibold">EN VIVO</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min="0" max="20" inputMode="numeric"
                              value={inp.home}
                              onChange={(e) => setInput(match.id, 'home', e.target.value)}
                              onBlur={() => handleBlur(match.id, inp.home, inp.away)}
                              className="score-input"
                              placeholder="0"
                            />
                            <span className="font-display text-xl text-gray-300">–</span>
                            <input
                              type="number" min="0" max="20" inputMode="numeric"
                              value={inp.away}
                              onChange={(e) => setInput(match.id, 'away', e.target.value)}
                              onBlur={() => handleBlur(match.id, inp.home, inp.away)}
                              className="score-input"
                              placeholder="0"
                            />
                          </div>
                        )}

                        {/* Inline save status */}
                        {status === 'saving' && (
                          <span className="text-xs text-gray-400">Guardando...</span>
                        )}
                        {status === 'saved' && (
                          <span className="text-xs text-green-600 font-medium">✓ Guardado</span>
                        )}
                        {status === 'error' && (
                          <span className="text-xs text-red-500">✗ {errors[match.id] ?? 'Error'}</span>
                        )}

                        {/* Ver picks link for live/finished */}
                        {(isLive || isFinished) && (
                          <Link
                            href={`/match/${match.id}`}
                            className="text-xs text-[#0a4a2e] font-semibold underline hover:no-underline"
                          >
                            Ver picks →
                          </Link>
                        )}
                      </div>

                      {/* Away team */}
                      <div className="flex flex-col items-center gap-0.5 w-16 flex-none">
                        {match.away_team_logo && (
                          <Image src={match.away_team_logo} alt={match.away_team} width={28} height={28} className="object-contain" />
                        )}
                        <span className="text-xs font-medium text-center leading-tight line-clamp-2">
                          {match.away_team}
                        </span>
                      </div>

                      {/* Bonus link */}
                      {bonusCount > 0 && (
                        <Link
                          href={`/picks/${match.id}`}
                          className="flex-none text-xs bg-[#e8f5e9] text-[#0a4a2e] font-bold
                                     px-2 py-1 rounded-full hover:bg-[#0a4a2e] hover:text-white transition-colors"
                        >
                          🎯 {bonusCount}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
