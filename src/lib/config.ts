// Feature flags — set to false to disable without deleting code
export const FEATURES = {
  bonusQuestions:    true,
  specialPicks:      true,
  progressionChart:  true,
  emailReminders:    true,
  colombiaHighlight: true,
} as const;

// Registration deadline: June 11, 2026 at 13:45 Colombia time (UTC-5)
// = 15 minutes before first kickoff = 18:45 UTC
export const REGISTRATION_DEADLINE = new Date('2026-06-11T18:45:00Z');

// Tournament kickoff: June 11, 2026 at 8:00 PM Mexico City time (UTC-6)
export const TOURNAMENT_KICKOFF = new Date('2026-06-12T02:00:00Z');

// Special picks reveal: June 11, 2026 at 14:00 Colombia time (UTC-5) = 19:00 UTC
export const SPECIAL_PICKS_REVEAL = new Date('2026-06-11T19:00:00Z');

// Pick lock window: 15 minutes before kickoff
export const PICK_LOCK_MINUTES = 15;

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
  'United States', 'Mexico', 'Canada', 'Panama', 'Curaçao', 'Haiti',
  // CONMEBOL (6)
  'Argentina', 'Brazil', 'Colombia', 'Uruguay', 'Ecuador', 'Paraguay',
  // UEFA (16)
  'England', 'France', 'Spain', 'Germany', 'Portugal', 'Netherlands',
  'Belgium', 'Croatia', 'Switzerland', 'Austria', 'Scotland', 'Norway',
  'Bosnia and Herzegovina', 'Sweden', 'Turkey', 'Czech Republic',
  // CAF (10)
  'Morocco', 'Senegal', 'Egypt', 'Algeria', 'Tunisia',
  'South Africa', 'Ivory Coast', 'Ghana', 'Cape Verde', 'DR Congo',
  // AFC (9)
  'Japan', 'Iran', 'South Korea', 'Australia', 'Saudi Arabia',
  'Qatar', 'Uzbekistan', 'Jordan', 'Iraq',
  // OFC (1)
  'New Zealand',
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


export const WC2026_COLOMBIA_SQUAD = [
  'Camilo Vargas', 'Álvaro Montero', 'David Ospina',
  'Dávinson Sánchez', 'Jhon Lucumí', 'Yerry Mina', 'Willer Ditta',
  'Daniel Muñoz', 'Santiago Arias', 'Johan Mojica', 'Déiver Machado',
  'Richard Ríos', 'Jefferson Lerma', 'Kevin Castaño', 'Juan Camilo Portilla',
  'Gustavo Puerta', 'Jhon Arias', 'Jorge Carrascal', 'Juan Fernando Quintero',
  'James Rodríguez', 'Jaminton Campaz',
  'Juan Camilo Hernández', 'Luis Díaz', 'Luis Suárez', 'Carlos Gómez', 'Jhon Córdoba',
] as const;
