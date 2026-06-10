// Feature flags — set to false to disable without deleting code
export const FEATURES = {
  bonusQuestions:    true,
  specialPicks:      true,
  progressionChart:  true,
  emailReminders:    true,
  colombiaHighlight: true,
} as const;

// Registration deadline: June 10, 2026 at 23:59 Colombia time (UTC-5)
// = June 11, 2026 04:59 UTC
export const REGISTRATION_DEADLINE = new Date('2026-06-11T04:59:00Z');

// Tournament kickoff: June 11, 2026 at 8:00 PM Mexico City time (UTC-6)
export const TOURNAMENT_KICKOFF = new Date('2026-06-12T02:00:00Z');

// Pick lock window: 1 hour before kickoff
export const PICK_LOCK_MINUTES = 60;

// Reminder window: 2 hours before lock (= 3 hours before kickoff)
export const REMINDER_HOURS_BEFORE_LOCK = 2;

// API usage thresholds (100 calls/day free tier)
export const API_USAGE_SLOW_POLL_THRESHOLD = 80;
export const API_USAGE_STOP_THRESHOLD      = 95;
export const API_USAGE_DAILY_LIMIT         = 100;

// Max bonus questions per match
export const MAX_BONUS_QUESTIONS_PER_MATCH = 5;

// Colombia teams list (for highlighting)
export const COLOMBIA_TEAM_NAME = 'Colombia';

// Confirmed 48 qualified teams for FIFA World Cup 2026
export const WC2026_TEAMS = [
  // CONCACAF (6)
  'United States', 'Mexico', 'Canada', 'Panama', 'Costa Rica', 'Honduras',
  // CONMEBOL (6)
  'Argentina', 'Brazil', 'Colombia', 'Uruguay', 'Ecuador', 'Venezuela',
  // UEFA (16)
  'Germany', 'Spain', 'France', 'England', 'Portugal', 'Netherlands',
  'Belgium', 'Italy', 'Croatia', 'Austria', 'Switzerland', 'Serbia',
  'Hungary', 'Slovakia', 'Denmark', 'Turkey',
  // CAF (9)
  'Morocco', 'Senegal', 'Egypt', 'Nigeria', 'South Africa',
  'Algeria', 'Cameroon', 'Tunisia', 'Mali',
  // AFC (8)
  'Japan', 'South Korea', 'Iran', 'Saudi Arabia',
  'Australia', 'Indonesia', 'China', 'Uzbekistan',
  // OFC (1)
  'New Zealand',
  // Playoff spots (2)
  'Playoff 1 (TBD)', 'Playoff 2 (TBD)',
] as const;

export type WC2026Team = (typeof WC2026_TEAMS)[number];

// Phases for Colombia elimination pick
export const COLOMBIA_ELIMINATION_PHASES = [
  'Fase de grupos',
  'Ronda de 32',
  'Ronda de 16',
  'Cuartos de final',
  'Semifinales',
  'Final',
  'Campeón',
] as const;

export type ColombiaEliminationPhase = (typeof COLOMBIA_ELIMINATION_PHASES)[number];
