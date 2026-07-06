'use client';

import { useState, useMemo, Fragment } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Match {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  phase: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface PickData {
  user_id: string;
  match_id: string;
  home_pick: number;
  away_pick: number;
  points_earned: number | null;
}

interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface LbEntry {
  user_id: string;
  group_pts: number;
  knockout_pts: number;
  bonus_pts: number;
  special_pts: number;
  total_points: number;
  exact_results_count: number;
  rank: number;
}

interface Props {
  matches: Match[];
  picks: PickData[];
  users: User[];
  leaderboard: LbEntry[];
  currentUserId: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PHASE_ORDER = [
  'group', 'round_of_32', 'round_of_16', 'quarterfinal',
  'semifinal', 'third_place', 'final',
];

const PHASE_LABELS: Record<string, string> = {
  group:        'Fase de grupos',
  round_of_32:  'Ronda de 32',
  round_of_16:  'Octavos de final',
  quarterfinal: 'Cuartos de final',
  semifinal:    'Semifinal',
  third_place:  'Tercer puesto',
  final:        'Gran Final',
};

type Outcome = 'exact' | 'correct_winner' | 'wrong' | 'none';

function getOutcome(match: Match, pick: PickData | undefined): Outcome {
  if (!pick || match.home_score === null || match.away_score === null) return 'none';
  if (pick.home_pick === match.home_score && pick.away_pick === match.away_score) return 'exact';
  const resWinner =
    match.home_score > match.away_score ? 'home' :
    match.away_score > match.home_score ? 'away' : 'draw';
  const pickWinner =
    pick.home_pick > pick.away_pick ? 'home' :
    pick.away_pick > pick.home_pick ? 'away' : 'draw';
  return resWinner === pickWinner ? 'correct_winner' : 'wrong';
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ResultadosView({ matches, picks, users, leaderboard, currentUserId }: Props) {
  const [selectedTab, setSelectedTab] = useState<'comparison' | string>('comparison');

  // pick lookup: picksByUser[userId][matchId]
  const picksByUser = useMemo(() => {
    const map = new Map<string, Map<string, PickData>>();
    for (const p of picks) {
      if (!map.has(p.user_id)) map.set(p.user_id, new Map());
      map.get(p.user_id)!.set(p.match_id, p);
    }
    return map;
  }, [picks]);

  const lbMap = useMemo(
    () => new Map(leaderboard.map((l) => [l.user_id, l])),
    [leaderboard],
  );

  // Sort users by total_points DESC
  const sortedUsers = useMemo(
    () => [...users].sort(
      (a, b) => (lbMap.get(b.id)?.total_points ?? 0) - (lbMap.get(a.id)?.total_points ?? 0),
    ),
    [users, lbMap],
  );

  // Sort matches by phase order then kickoff
  const sortedMatches = useMemo(
    () =>
      [...matches].sort((a, b) => {
        const pa = PHASE_ORDER.indexOf(a.phase);
        const pb = PHASE_ORDER.indexOf(b.phase);
        if (pa !== pb) return pa - pb;
        return new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime();
      }),
    [matches],
  );

  const selectedUser = users.find((u) => u.id === selectedTab);

  return (
    <div>
      {/* ── Tab bar ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-gray-200">
        <TabBtn
          active={selectedTab === 'comparison'}
          onClick={() => setSelectedTab('comparison')}
        >
          Comparar todos
        </TabBtn>
        {sortedUsers.map((u) => (
          <TabBtn
            key={u.id}
            active={selectedTab === u.id}
            highlight={u.id === currentUserId}
            onClick={() => setSelectedTab(u.id)}
          >
            {u.display_name}
            {u.id === currentUserId ? ' (yo)' : ''}
          </TabBtn>
        ))}
      </div>

      {selectedTab === 'comparison' ? (
        <ComparisonTable
          matches={sortedMatches}
          users={sortedUsers}
          picksByUser={picksByUser}
          lbMap={lbMap}
          currentUserId={currentUserId}
        />
      ) : (
        selectedUser && (
          <UserBreakdown
            matches={sortedMatches}
            userPicks={picksByUser.get(selectedUser.id) ?? new Map()}
            lbEntry={lbMap.get(selectedUser.id)}
          />
        )
      )}
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function TabBtn({
  active,
  highlight,
  onClick,
  children,
}: {
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-[#0a4a2e] text-white'
          : highlight
          ? 'bg-[#f5c842]/30 text-[#0a4a2e] hover:bg-[#f5c842]/50'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

// ── Comparison table ───────────────────────────────────────────────────────────
function ComparisonTable({
  matches,
  users,
  picksByUser,
  lbMap,
  currentUserId,
}: {
  matches: Match[];
  users: User[];
  picksByUser: Map<string, Map<string, PickData>>;
  lbMap: Map<string, LbEntry>;
  currentUserId: string;
}) {
  // Group matches by phase (in PHASE_ORDER order)
  const phaseGroups = PHASE_ORDER
    .map((phase) => ({ phase, rows: matches.filter((m) => m.phase === phase) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="text-xs w-full border-collapse">

        {/* Header */}
        <thead>
          <tr className="bg-[#0a4a2e] text-white">
            <th className="sticky left-0 z-10 bg-[#0a4a2e] text-left px-3 py-3 font-semibold min-w-[170px] border-r border-white/20">
              Partido
            </th>
            <th className="px-3 py-3 text-center font-semibold w-16 border-r border-white/20">
              Result.
            </th>
            {users.map((u) => {
              const lb = lbMap.get(u.id);
              const isCurrent = u.id === currentUserId;
              return (
                <th
                  key={u.id}
                  className={`px-2 py-2 text-center font-semibold w-24 ${isCurrent ? 'bg-[#f5c842] text-[#0a4a2e]' : ''}`}
                >
                  <div className="truncate max-w-[88px]">{u.display_name}</div>
                  {lb && <div className="text-[10px] font-normal opacity-70">#{lb.rank}</div>}
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body — grouped by phase */}
        <tbody>
          {phaseGroups.map(({ phase, rows }) => (
            <Fragment key={phase}>
              {/* Phase separator */}
              <tr className="bg-[#0a4a2e]/10">
                <td
                  colSpan={users.length + 2}
                  className="px-3 py-1.5 text-[10px] font-bold text-[#0a4a2e] uppercase tracking-wider"
                >
                  {PHASE_LABELS[phase] ?? phase}
                </td>
              </tr>

              {/* Match rows */}
              {rows.map((match) => (
                <tr key={match.id} className="border-t border-gray-100 hover:bg-gray-50/40">
                  {/* Match name — sticky */}
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-gray-700 whitespace-nowrap border-r border-gray-100 hover:bg-gray-50/40">
                    <span className="font-medium">{match.home_team}</span>
                    <span className="text-gray-400 mx-1">vs</span>
                    <span className="font-medium">{match.away_team}</span>
                  </td>

                  {/* Result */}
                  <td className="px-3 py-2 text-center border-r border-gray-100 whitespace-nowrap">
                    {match.home_score !== null ? (
                      <span className="font-mono font-semibold text-gray-700">
                        {match.home_score}–{match.away_score}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Per-user cells */}
                  {users.map((u) => {
                    const pick = picksByUser.get(u.id)?.get(match.id);
                    const outcome = getOutcome(match, pick);
                    const isCurrent = u.id === currentUserId;

                    const cellBg =
                      outcome === 'exact'          ? 'bg-green-50' :
                      outcome === 'correct_winner' ? 'bg-yellow-50' :
                      '';

                    const textColor =
                      outcome === 'exact'          ? 'text-green-700' :
                      outcome === 'correct_winner' ? 'text-yellow-700' :
                      'text-gray-400';

                    return (
                      <td
                        key={u.id}
                        className={`px-2 py-2 text-center whitespace-nowrap ${cellBg} ${isCurrent ? 'ring-inset ring-1 ring-[#f5c842]/60' : ''}`}
                      >
                        {pick ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`font-mono font-medium ${textColor}`}>
                              {pick.home_pick}–{pick.away_pick}
                            </span>
                            {pick.points_earned !== null && (
                              <span className={`text-[10px] font-semibold ${textColor}`}>
                                {pick.points_earned > 0 ? `+${pick.points_earned}` : '0'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>

        {/* Footer — totals */}
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50">
            <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 font-semibold text-gray-700 border-r border-gray-200">
              Pts partidos
            </td>
            <td className="border-r border-gray-200" />
            {users.map((u) => {
              const total = matches.reduce(
                (sum, m) => sum + (picksByUser.get(u.id)?.get(m.id)?.points_earned ?? 0),
                0,
              );
              return (
                <td key={u.id} className="text-center px-2 py-2 font-semibold text-gray-700">
                  {total}
                </td>
              );
            })}
          </tr>

          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-gray-500 border-r border-gray-200">
              Pts bonus
            </td>
            <td className="border-r border-gray-200" />
            {users.map((u) => (
              <td key={u.id} className="text-center px-2 py-2 text-gray-500">
                {lbMap.get(u.id)?.bonus_pts ?? 0}
              </td>
            ))}
          </tr>

          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-gray-500 border-r border-gray-200">
              Pts especiales
            </td>
            <td className="border-r border-gray-200" />
            {users.map((u) => (
              <td key={u.id} className="text-center px-2 py-2 text-gray-500">
                {lbMap.get(u.id)?.special_pts ?? 0}
              </td>
            ))}
          </tr>

          <tr className="bg-[#0a4a2e] border-t-2 border-[#0a4a2e]">
            <td className="sticky left-0 z-10 bg-[#0a4a2e] px-3 py-3 font-bold text-white border-r border-white/20">
              TOTAL
            </td>
            <td className="border-r border-white/20" />
            {users.map((u) => {
              const lb = lbMap.get(u.id);
              const isCurrent = u.id === currentUserId;
              return (
                <td
                  key={u.id}
                  className={`text-center px-2 py-3 font-bold text-sm ${isCurrent ? 'text-[#f5c842]' : 'text-white'}`}
                >
                  {lb?.total_points ?? 0}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── User breakdown ─────────────────────────────────────────────────────────────
function UserBreakdown({
  matches,
  userPicks,
  lbEntry,
}: {
  matches: Match[];
  userPicks: Map<string, PickData>;
  lbEntry: LbEntry | undefined;
}) {
  // Group by phase
  const byPhase = new Map<string, Match[]>();
  for (const m of matches) {
    if (!byPhase.has(m.phase)) byPhase.set(m.phase, []);
    byPhase.get(m.phase)!.push(m);
  }

  return (
    <div className="space-y-4">
      {PHASE_ORDER.map((phase) => {
        const phaseMatches = byPhase.get(phase);
        if (!phaseMatches?.length) return null;

        const phaseTotal = phaseMatches.reduce(
          (sum, m) => sum + (userPicks.get(m.id)?.points_earned ?? 0),
          0,
        );

        return (
          <div key={phase} className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Phase header */}
            <div className="bg-[#0a4a2e]/10 px-4 py-2.5 flex justify-between items-center border-b border-gray-200">
              <span className="font-semibold text-[#0a4a2e] text-sm">
                {PHASE_LABELS[phase] ?? phase}
              </span>
              <span className="text-sm font-bold text-[#0a4a2e]">{phaseTotal} pts</span>
            </div>

            {/* Match table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Partido</th>
                    <th className="text-center px-3 py-2 font-medium">Resultado</th>
                    <th className="text-center px-3 py-2 font-medium">Pick</th>
                    <th className="text-center px-3 py-2 font-medium">Calificación</th>
                    <th className="text-right px-4 py-2 font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {phaseMatches.map((m) => {
                    const pick    = userPicks.get(m.id);
                    const outcome = getOutcome(m, pick);

                    const pickColor =
                      outcome === 'exact'          ? 'text-green-700 font-semibold' :
                      outcome === 'correct_winner' ? 'text-yellow-600 font-semibold' :
                      'text-gray-500';

                    const ptsColor =
                      outcome === 'exact'          ? 'text-green-700' :
                      outcome === 'correct_winner' ? 'text-yellow-600' :
                      'text-gray-400';

                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-800">
                          <span className="font-medium">{m.home_team}</span>
                          <span className="text-gray-400 mx-1.5 text-xs">vs</span>
                          <span className="font-medium">{m.away_team}</span>
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono text-gray-600">
                          {m.home_score !== null
                            ? `${m.home_score}–${m.away_score}`
                            : <span className="text-gray-300">—</span>}
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono">
                          {pick
                            ? <span className={pickColor}>{pick.home_pick}–{pick.away_pick}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {outcome === 'exact' && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              Exacto ✓
                            </span>
                          )}
                          {outcome === 'correct_winner' && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                              Ganador ✓
                            </span>
                          )}
                          {(outcome === 'wrong' || outcome === 'none') && (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-4 py-2.5 text-right font-semibold">
                          {pick?.points_earned != null ? (
                            <span className={ptsColor}>
                              {pick.points_earned > 0 ? `+${pick.points_earned}` : '0'}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Summary card */}
      {lbEntry && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-[#0a4a2e] px-4 py-3">
            <span className="font-semibold text-white">Resumen de puntos</span>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-600">Fase de grupos</span>
              <span className="font-medium text-gray-800">{lbEntry.group_pts} pts</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-600">Eliminatorias</span>
              <span className="font-medium text-gray-800">{lbEntry.knockout_pts} pts</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-600">Preguntas bonus</span>
              <span className="font-medium text-gray-800">{lbEntry.bonus_pts} pts</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-gray-600">Picks especiales</span>
              <span className="font-medium text-gray-800">{lbEntry.special_pts} pts</span>
            </div>
            <div className="flex justify-between items-center px-4 py-4 bg-[#0a4a2e]/5">
              <div>
                <div className="font-bold text-[#0a4a2e] text-base">Total general</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {lbEntry.exact_results_count} resultado{lbEntry.exact_results_count !== 1 ? 's' : ''} exacto{lbEntry.exact_results_count !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="font-bold text-[#0a4a2e] text-2xl">{lbEntry.total_points} pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
