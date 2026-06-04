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

// All 48 World Cup 2026 teams (for special picks dropdowns)
export const WC2026_TEAMS = [
  'Argentina', 'Australia', 'Brazil', 'Canada', 'Chile', 'Colombia',
  'Costa Rica', 'Ecuador', 'Honduras', 'Jamaica', 'Mexico', 'Panama',
  'Paraguay', 'Peru', 'United States', 'Uruguay', 'Venezuela',
  'Algeria', 'Cameroon', 'Côte d\'Ivoire', 'Egypt', 'Ghana', 'Mali',
  'Morocco', 'Nigeria', 'Senegal', 'South Africa', 'Tunisia',
  'China', 'Indonesia', 'Iran', 'Japan', 'New Zealand', 'Saudi Arabia',
  'South Korea', 'Uzbekistan',
  'Albania', 'Austria', 'Belgium', 'Croatia', 'Czech Republic',
  'England', 'France', 'Germany', 'Hungary', 'Italy', 'Netherlands',
  'Poland', 'Portugal', 'Romania', 'Serbia', 'Slovakia', 'Spain',
  'Switzerland', 'Turkey', 'Ukraine',
] as const;

export type WC2026Team = (typeof WC2026_TEAMS)[number];
