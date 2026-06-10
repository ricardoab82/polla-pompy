// Pure points calculation — no side effects, safe to unit test
// Scoring rules per spec. New rules are additive: add cases, never modify.

export type Phase =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinal'
  | 'final';

export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface Pick {
  homePick: number;
  awayPick: number;
}

// Points table per phase: [exact, correct_winner]
const PHASE_POINTS: Record<Phase, [number, number]> = {
  group:       [3, 1],
  round_of_32: [4, 2],
  round_of_16: [5, 2],
  quarterfinal:[7, 3],
  semifinal:   [10, 4],
  final:       [15, 6],
};

export type PickOutcome = 'exact' | 'correct_winner' | 'wrong';

export function getPickOutcome(result: MatchResult, pick: Pick): PickOutcome {
  const { homeScore, awayScore } = result;
  const { homePick, awayPick }   = pick;

  if (homePick === homeScore && awayPick === awayScore) {
    return 'exact';
  }

  const resultWinner =
    homeScore > awayScore ? 'home' :
    awayScore > homeScore ? 'away' : 'draw';

  const pickWinner =
    homePick > awayPick ? 'home' :
    awayPick > homePick ? 'away' : 'draw';

  if (resultWinner === pickWinner) {
    return 'correct_winner';
  }

  return 'wrong';
}

export function calculatePoints(
  result: MatchResult,
  pick: Pick,
  phase: Phase
): number {
  const [exactPts, correctWinnerPts] = PHASE_POINTS[phase];
  const outcome = getPickOutcome(result, pick);

  switch (outcome) {
    case 'exact':          return exactPts;
    case 'correct_winner': return correctWinnerPts;
    case 'wrong':          return 0;
  }
}

// Special picks points values (graded manually by admin)
export const SPECIAL_PICK_POINTS = {
  champion:                  20,
  runner_up:                 10,
  top_scorer:                10,
  golden_ball:                5,
  golden_glove:               5,
  best_defense:               5,
  colombia_eliminated_phase: 10,
  colombia_top_scorer:        8,
} as const;

export type SpecialPickType = keyof typeof SPECIAL_PICK_POINTS;

export function calculateSpecialPickPoints(
  type: SpecialPickType,
  isCorrect: boolean
): number {
  return isCorrect ? SPECIAL_PICK_POINTS[type] : 0;
}

// Expose phase points for display purposes
export function getPhasePoints(phase: Phase): { exact: number; correctWinner: number } {
  const [exact, correctWinner] = PHASE_POINTS[phase];
  return { exact, correctWinner };
}
