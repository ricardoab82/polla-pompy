'use client';

import { useState, useTransition, useCallback } from 'react';
import Image from 'next/image';
import type { MatchRow } from '@/lib/supabase/types';
import { submitBulkPicksAction } from '@/features/picks/actions';

type PickInfo = {
  home_pick: number;
  away_pick: number;
  points_earned: number | null;
};

interface BracketViewProps {
  matches: MatchRow[];
  pickMap: Record<string, PickInfo>;
  bracketPicksOpen: boolean;
}

const ROUNDS = [
  { phase: 'round_of_32' as const,  label: 'Ronda de 32', short: 'R32' },
  { phase: 'round_of_16' as const,  label: 'Octavos',     short: 'R16' },
  { phase: 'quarterfinal' as const, label: 'Cuartos',     short: 'CUA' },
  { phase: 'semifinal' as const,    label: 'Semifinal',   short: 'SF'  },
  { phase: 'final' as const,        label: 'Final',       short: 'FIN' },
];

type SaveStatus = 'saving' | 'saved' | 'error';

function formatDate(kickoff: string): string {
  return new Date(kickoff).toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getWinner(m: MatchRow): 'home' | 'away' | null {
  if (m.status !== 'finished' || m.home_score == null || m.away_score == null) return null;
  if (m.home_score > m.away_score) return 'home';
  if (m.away_score > m.home_score) return 'away';
  return null;
}

// ─── Team row ────────────────────────────────────────────────

interface TeamRowProps {
  logo: string | null;
  name: string;
  isWinner: boolean;
  isLoser: boolean;
  score: number | null | undefined;
  inputValue: string;
  showInput: boolean;
  showPickReadOnly: string | undefined;
  onInput: (v: string) => void;
  onBlur: () => void;
  mobile: boolean;
}

function TeamRow({
  logo, name, isWinner, isLoser,
  score, inputValue, showInput, showPickReadOnly,
  onInput, onBlur, mobile,
}: TeamRowProps) {
  const h       = mobile ? 'h-10' : 'h-7';
  const imgSize = mobile ? 20 : 16;
  const nameCls = mobile ? 'text-sm' : 'text-xs';
  const scoreCls = mobile ? 'text-base w-6' : 'text-sm w-5';

  return (
    <div
      className={`flex items-center gap-1.5 px-2 ${h}
        ${isWinner ? 'bg-green-50' : ''}
        ${isLoser  ? 'opacity-40' : ''}
      `}
    >
      {logo ? (
        <Image
          src={logo} alt="" width={imgSize} height={imgSize}
          className="rounded-sm object-contain flex-shrink-0"
        />
      ) : (
        <div
          className="rounded-sm bg-gray-200 flex-shrink-0"
          style={{ width: imgSize, height: imgSize }}
        />
      )}

      <span
        className={`flex-1 truncate font-medium ${nameCls}
          ${isWinner ? 'text-[#0a4a2e] font-bold' : 'text-gray-800'}
        `}
      >
        {name || 'Por definir'}
      </span>

      {/* Actual score (live / finished) */}
      {score !== undefined && (
        <span className={`font-bold text-right flex-shrink-0 ${scoreCls} ${isWinner ? 'text-[#0a4a2e]' : 'text-gray-600'}`}>
          {score ?? '–'}
        </span>
      )}

      {/* Read-only pick */}
      {score === undefined && showPickReadOnly !== undefined && !showInput && (
        <span className={`font-bold font-mono text-[#f5c842] text-right flex-shrink-0 ${scoreCls}`}>
          {showPickReadOnly}
        </span>
      )}

      {/* Editable input */}
      {showInput && (
        <input
          type="number" min="0" max="99"
          value={inputValue}
          onChange={e => onInput(e.target.value)}
          onBlur={onBlur}
          className={`text-center border border-gray-300 rounded font-mono focus:outline-none focus:border-[#0a4a2e]
            ${mobile ? 'w-12 h-8 text-sm' : 'w-8 h-5 text-xs'}
          `}
          placeholder="–"
        />
      )}
    </div>
  );
}

// ─── Match card ───────────────────────────────────────────────

interface MatchCardProps {
  match: MatchRow;
  pick: PickInfo | undefined;
  bracketPicksOpen: boolean;
  inputs: { home: string; away: string };
  onInputChange: (matchId: string, side: 'home' | 'away', value: string) => void;
  onBlur: (matchId: string, home: string, away: string) => void;
  status: SaveStatus | undefined;
  error: string | undefined;
  mobile?: boolean;
}

function MatchCard({
  match, pick, bracketPicksOpen,
  inputs, onInputChange, onBlur,
  status, error,
  mobile = false,
}: MatchCardProps) {
  const winner  = getWinner(match);
  const isLive  = match.status === 'live';
  const isDone  = match.status === 'finished';
  const canEdit = bracketPicksOpen && match.status === 'scheduled';
  const showScore = isDone || isLive;

  const triggerBlur = () => onBlur(match.id, inputs.home, inputs.away);

  return (
    <div
      className={`rounded-lg bg-white shadow-sm overflow-hidden border
        ${match.is_colombia_match ? 'border-yellow-400' : 'border-gray-200'}
        ${mobile ? 'rounded-xl border-2 shadow-md' : 'w-48'}
        ${status === 'saved' ? 'ring-1 ring-green-300' : ''}
        ${status === 'error' ? 'ring-1 ring-red-300'   : ''}
      `}
    >
      {/* EN VIVO banner */}
      {isLive && (
        <div className="bg-red-500 text-white text-[9px] font-bold text-center py-0.5 tracking-wide animate-pulse">
          EN VIVO
        </div>
      )}

      {/* Home */}
      <TeamRow
        logo={match.home_team_logo}
        name={match.home_team}
        isWinner={winner === 'home'}
        isLoser={winner === 'away'}
        score={showScore ? match.home_score : undefined}
        inputValue={inputs.home}
        showInput={canEdit}
        showPickReadOnly={!canEdit && !showScore && pick != null ? String(pick.home_pick) : undefined}
        onInput={v => onInputChange(match.id, 'home', v)}
        onBlur={triggerBlur}
        mobile={mobile}
      />

      <div className="border-t border-gray-100 mx-2" />

      {/* Away */}
      <TeamRow
        logo={match.away_team_logo}
        name={match.away_team}
        isWinner={winner === 'away'}
        isLoser={winner === 'home'}
        score={showScore ? match.away_score : undefined}
        inputValue={inputs.away}
        showInput={canEdit}
        showPickReadOnly={!canEdit && !showScore && pick != null ? String(pick.away_pick) : undefined}
        onInput={v => onInputChange(match.id, 'away', v)}
        onBlur={triggerBlur}
        mobile={mobile}
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-2 py-1 bg-gray-50 gap-1">
        <span className={`text-gray-400 truncate ${mobile ? 'text-xs' : 'text-[10px]'}`}>
          {formatDate(match.kickoff_utc)}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {status === 'saving' && (
            <span className={`text-gray-400 ${mobile ? 'text-xs' : 'text-[9px]'}`}>Guardando…</span>
          )}
          {status === 'saved' && (
            <span className={`text-green-600 font-medium ${mobile ? 'text-xs' : 'text-[9px]'}`}>✓ Guardado</span>
          )}
          {status === 'error' && (
            <span className={`text-red-500 ${mobile ? 'text-xs' : 'text-[9px]'}`}>
              ✗ {error ?? 'Error'}
            </span>
          )}
        </div>
      </div>

      {/* Points earned */}
      {isDone && pick?.points_earned != null && (
        <div className={`text-center font-medium bg-amber-50 text-amber-700
          ${mobile ? 'text-xs py-1' : 'text-[9px] py-0.5'}
        `}>
          +{pick.points_earned} pts
        </div>
      )}
    </div>
  );
}

// ─── Round column (desktop) ───────────────────────────────────

interface RoundColumnProps {
  label: string;
  matches: MatchRow[];
  pickMap: Record<string, PickInfo>;
  bracketPicksOpen: boolean;
  inputs: Record<string, { home: string; away: string }>;
  onInputChange: (matchId: string, side: 'home' | 'away', value: string) => void;
  onBlur: (matchId: string, home: string, away: string) => void;
  statuses: Record<string, SaveStatus>;
  errors: Record<string, string>;
  isLast: boolean;
}

function RoundColumn({
  label, matches, pickMap, bracketPicksOpen,
  inputs, onInputChange, onBlur, statuses, errors, isLast,
}: RoundColumnProps) {
  return (
    <div className="flex flex-col flex-shrink-0">
      <div className="text-center pb-3 px-2">
        <span className="text-[11px] font-bold text-[#0a4a2e] uppercase tracking-wider">{label}</span>
        {matches.length > 0 && (
          <span className="ml-1 text-[10px] text-gray-400">({matches.length})</span>
        )}
      </div>

      <div className={`flex flex-col gap-3 px-2 ${isLast ? 'pr-0' : ''}`}>
        {matches.length === 0 ? (
          <div className="w-48 flex items-center justify-center h-16 rounded-lg border border-dashed border-gray-200 text-xs text-gray-300">
            Por definir
          </div>
        ) : (
          matches.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              pick={pickMap[m.id]}
              bracketPicksOpen={bracketPicksOpen}
              inputs={inputs[m.id] ?? { home: '', away: '' }}
              onInputChange={onInputChange}
              onBlur={onBlur}
              status={statuses[m.id]}
              error={errors[m.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Separator() {
  return (
    <div className="flex flex-col items-center justify-start pt-8 flex-shrink-0 px-1">
      <div className="w-px flex-1 bg-gray-100" />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────

export default function BracketView({ matches, pickMap, bracketPicksOpen }: BracketViewProps) {
  const [mobileRound, setMobileRound] = useState<string>(() => {
    const first = ROUNDS.find(r => matches.some(m => m.phase === r.phase));
    return first?.phase ?? ROUNDS[0].phase;
  });

  const initInputs = () => {
    const init: Record<string, { home: string; away: string }> = {};
    for (const [id, p] of Object.entries(pickMap)) {
      init[id] = { home: String(p.home_pick), away: String(p.away_pick) };
    }
    return init;
  };

  const [inputs,    setInputs]    = useState<Record<string, { home: string; away: string }>>(initInputs);
  const [lastSaved, setLastSaved] = useState<Record<string, { home: string; away: string }>>(initInputs);
  const [statuses,  setStatuses]  = useState<Record<string, SaveStatus>>({});
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  const handleInputChange = useCallback(
    (matchId: string, side: 'home' | 'away', value: string) => {
      setInputs(prev => ({
        ...prev,
        [matchId]: { ...(prev[matchId] ?? { home: '', away: '' }), [side]: value },
      }));
      setStatuses(prev => { const n = { ...prev }; delete n[matchId]; return n; });
      setErrors(prev   => { const n = { ...prev }; delete n[matchId]; return n; });
    },
    [],
  );

  const handleBlur = useCallback(
    (matchId: string, home: string, away: string) => {
      if (home === '' || away === '') return;

      const last = lastSaved[matchId];
      if (last && last.home === home && last.away === away) return;

      if (statuses[matchId] === 'saving') return;

      setStatuses(prev => ({ ...prev, [matchId]: 'saving' }));

      startTransition(async () => {
        const result = await submitBulkPicksAction([
          { match_id: matchId, home_pick: Number(home), away_pick: Number(away) },
        ]);

        if (result.errors[matchId]) {
          setStatuses(prev => ({ ...prev, [matchId]: 'error' }));
          setErrors(prev   => ({ ...prev, [matchId]: result.errors[matchId] }));
        } else {
          setStatuses(prev  => ({ ...prev, [matchId]: 'saved' }));
          setLastSaved(prev => ({ ...prev, [matchId]: { home, away } }));
        }
      });
    },
    [lastSaved, statuses, startTransition],
  );

  const matchesByPhase = Object.fromEntries(
    ROUNDS.map(r => [r.phase, matches.filter(m => m.phase === r.phase)]),
  );

  const finalMatch = matchesByPhase['final']?.[0];
  const winner     = finalMatch ? getWinner(finalMatch) : null;
  const champion   =
    winner === 'home' ? finalMatch!.home_team :
    winner === 'away' ? finalMatch!.away_team :
    null;

  const sharedProps = {
    pickMap, bracketPicksOpen, inputs,
    onInputChange: handleInputChange,
    onBlur: handleBlur,
    statuses, errors,
  };

  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto pb-6">
        <div className="flex min-w-max">
          {ROUNDS.map((round, i) => (
            <div key={round.phase} className="flex">
              <RoundColumn
                label={round.label}
                matches={matchesByPhase[round.phase] ?? []}
                isLast={i === ROUNDS.length - 1}
                {...sharedProps}
              />
              {i < ROUNDS.length - 1 && <Separator />}
            </div>
          ))}

          {champion && (
            <div className="flex flex-col items-center justify-center pl-6 flex-shrink-0">
              <div className="flex flex-col items-center p-4 bg-[#0a4a2e] rounded-xl shadow-md">
                <span className="text-3xl mb-1">🏆</span>
                <span className="text-white text-xs font-medium mb-2">Campeón</span>
                <span className="px-3 py-1 bg-[#f5c842] rounded-full text-sm font-bold text-[#0a4a2e]">
                  {champion}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile ──────────────────────────────────────────── */}
      <div className="md:hidden">
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
          {ROUNDS.map(round => {
            const count = matchesByPhase[round.phase]?.length ?? 0;
            return (
              <button
                key={round.phase}
                onClick={() => setMobileRound(round.phase)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                  ${mobileRound === round.phase
                    ? 'bg-[#0a4a2e] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {round.label}
                {count > 0 && (
                  <span className={`ml-1 ${mobileRound === round.phase ? 'text-white/70' : 'text-gray-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {(() => {
          const roundMatches = matchesByPhase[mobileRound] ?? [];
          if (roundMatches.length === 0) {
            return (
              <div className="flex flex-col items-center py-12 text-center">
                <span className="text-3xl mb-3">⏳</span>
                <p className="text-sm text-gray-400">
                  Los partidos de esta ronda serán definidos próximamente
                </p>
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-3">
              {roundMatches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  pick={pickMap[m.id]}
                  bracketPicksOpen={bracketPicksOpen}
                  inputs={inputs[m.id] ?? { home: '', away: '' }}
                  onInputChange={handleInputChange}
                  onBlur={handleBlur}
                  status={statuses[m.id]}
                  error={errors[m.id]}
                  mobile
                />
              ))}
            </div>
          );
        })()}

        {mobileRound === 'final' && champion && (
          <div className="mt-4 flex flex-col items-center p-5 bg-[#0a4a2e] rounded-xl shadow-md">
            <span className="text-4xl mb-2">🏆</span>
            <span className="text-white/80 text-sm font-medium mb-2">Campeón del Mundial 2026</span>
            <span className="px-5 py-2 bg-[#f5c842] rounded-full text-base font-bold text-[#0a4a2e]">
              {champion}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
