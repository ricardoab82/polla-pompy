// Unit tests for scoring.ts — pure function, no side effects
// Run with: npx jest src/lib/scoring.test.ts

import {
  calculatePoints,
  getPickOutcome,
  type Phase,
} from './scoring';

describe('getPickOutcome', () => {
  test('exact result', () => {
    expect(getPickOutcome({ homeScore: 2, awayScore: 1 }, { homePick: 2, awayPick: 1 })).toBe('exact');
  });

  test('exact 0-0 draw', () => {
    expect(getPickOutcome({ homeScore: 0, awayScore: 0 }, { homePick: 0, awayPick: 0 })).toBe('exact');
  });

  test('correct winner (home)', () => {
    expect(getPickOutcome({ homeScore: 3, awayScore: 1 }, { homePick: 2, awayPick: 0 })).toBe('correct_winner');
  });

  test('correct winner (away)', () => {
    expect(getPickOutcome({ homeScore: 0, awayScore: 2 }, { homePick: 1, awayPick: 3 })).toBe('correct_winner');
  });

  test('correct draw', () => {
    expect(getPickOutcome({ homeScore: 1, awayScore: 1 }, { homePick: 2, awayPick: 2 })).toBe('correct_winner');
  });

  test('wrong: picked home win, away won', () => {
    expect(getPickOutcome({ homeScore: 0, awayScore: 2 }, { homePick: 2, awayPick: 0 })).toBe('wrong');
  });

  test('wrong: picked draw, home won', () => {
    expect(getPickOutcome({ homeScore: 2, awayScore: 1 }, { homePick: 1, awayPick: 1 })).toBe('wrong');
  });
});

describe('calculatePoints - group stage', () => {
  const phase: Phase = 'group';

  test('exact: 3 pts', () => {
    expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homePick: 2, awayPick: 1 }, phase)).toBe(3);
  });

  test('correct winner: 1 pt', () => {
    expect(calculatePoints({ homeScore: 3, awayScore: 0 }, { homePick: 1, awayPick: 0 }, phase)).toBe(1);
  });

  test('wrong: 0 pts', () => {
    expect(calculatePoints({ homeScore: 0, awayScore: 2 }, { homePick: 2, awayPick: 0 }, phase)).toBe(0);
  });
});

describe('calculatePoints - knockout phases', () => {
  const cases: Array<[Phase, number, number]> = [
    ['round_of_32', 4, 2],
    ['round_of_16', 5, 2],
    ['quarterfinal', 7, 3],
    ['semifinal', 10, 4],
    ['final', 15, 6],
  ];

  cases.forEach(([phase, exactPts, winnerPts]) => {
    test(`${phase}: exact=${exactPts}, winner=${winnerPts}`, () => {
      // Exact
      expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homePick: 2, awayPick: 1 }, phase)).toBe(exactPts);
      // Correct winner
      expect(calculatePoints({ homeScore: 3, awayScore: 0 }, { homePick: 1, awayPick: 0 }, phase)).toBe(winnerPts);
      // Wrong
      expect(calculatePoints({ homeScore: 0, awayScore: 2 }, { homePick: 2, awayPick: 0 }, phase)).toBe(0);
    });
  });
});
