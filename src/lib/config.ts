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

export const WC2026_GOALKEEPERS = [
  // CONMEBOL
  'Emiliano Martínez (Argentina)', 'Gerónimo Rulli (Argentina)', 'Juan Musso (Argentina)',
  'Alisson (Brasil)', 'Ederson (Brasil)', 'Weverton (Brasil)',
  'Camilo Vargas (Colombia)', 'Álvaro Montero (Colombia)', 'David Ospina (Colombia)', 'Devis Vásquez (Colombia)',
  'Hernán Galíndez (Ecuador)', 'Alexander Domínguez (Ecuador)', 'Carlos Morales (Ecuador)',
  'Pedro Gallese (Perú)', 'José Carvallo (Perú)',
  'Sergio Rochet (Uruguay)', 'Guillermo de Amores (Uruguay)',
  'Wuilker Faríñez (Venezuela)', 'Rafael Romo (Venezuela)',
  // CONCACAF
  'Guillermo Ochoa (México)', 'Carlos Acevedo (México)', 'Raúl Rangel (México)',
  'Chris Brady (USA)', 'Matt Freese (USA)', 'Matt Turner (USA)',
  'Patrick Pemberton (Costa Rica)', 'Esteban Alvarado (Costa Rica)',
  'Kevin Chamorro (Panamá)', 'Luis Mejía (Panamá)',
  'Harold Fonseca (Honduras)', 'Edrick Menjívar (Honduras)',
  'Andre Blake (Jamaica)', 'Dillon Barnes (Jamaica)',
  // UEFA
  'Thibaut Courtois (Bélgica)', 'Senne Lammens (Bélgica)',
  'Mike Maignan (Francia)', 'Brice Samba (Francia)',
  'Manuel Neuer (Alemania)', 'Oliver Baumann (Alemania)',
  'Unai Simón (España)', 'David Raya (España)',
  'Diogo Costa (Portugal)', 'José Sá (Portugal)',
  'Jordan Pickford (Inglaterra)', 'Dean Henderson (Inglaterra)',
  'Gianluigi Donnarumma (Italia)', 'Alex Meret (Italia)',
  'Dominik Livaković (Croacia)', 'Nediljko Labrović (Croacia)',
  'Patrick Pentz (Austria)', 'Heinz Lindner (Austria)',
  'Yann Sommer (Suiza)', 'Yvon Mvogo (Suiza)',
  'Predrag Rajković (Serbia)', 'Vanja Milinković-Savić (Serbia)',
  'Péter Gulácsi (Hungría)', 'Dénes Dibusz (Hungría)',
  'Marek Rodák (Eslovaquia)', 'Martin Dúbravka (Eslovaquia)',
  'Kasper Schmeichel (Dinamarca)', 'Frederik Rønnow (Dinamarca)',
  'Mert Günok (Turquía)', 'Altay Bayındır (Turquía)',
  'Andriy Lunin (Ucrania)', 'Anatolii Trubin (Ucrania)',
  // CAF
  'Yassine Bounou (Marruecos)', 'Ahmed Reda Tagnaouti (Marruecos)',
  'Edouard Mendy (Senegal)', 'Seny Dieng (Senegal)',
  'Gabaski (Egipto)', 'Mohamed El Shenawy (Egipto)',
  'Stanley Nwabali (Nigeria)', 'John Noble (Nigeria)',
  'Ronwen Williams (Sudáfrica)', 'Sipho Chaine (Sudáfrica)',
  'Yahia Fofana (Argelia)', 'Samir Kadri (Argelia)',
  'André Onana (Camerún)', 'Simon Ngapandouetnbu (Camerún)',
  'Aymen Dahmen (Túnez)', 'Bechir Ben Said (Túnez)',
  'Djigui Diarra (Mali)', 'Ibrahim Mounkoro (Mali)',
  // AFC
  'Shuichi Gonda (Japón)', 'Zion Suzuki (Japón)',
  'Kim Seung-gyu (Corea del Sur)', 'Jo Hyeon-woo (Corea del Sur)',
  'Alireza Beiranvand (Irán)', 'Hossein Hosseini (Irán)',
  'Mohammed Al-Owais (Arabia Saudita)', 'Mohammed Al-Rubaie (Arabia Saudita)',
  'Mat Ryan (Australia)', 'Joe Gauci (Australia)',
  'Ernando Ari (Indonesia)', 'Cahya Supriadi (Indonesia)',
  'Wang Dalei (China)', 'Yan Junling (China)',
  'Eldorbek Sobirov (Uzbekistán)', 'Shohjahon Ergashev (Uzbekistán)',
  // OFC
  'Oliver Sail (Nueva Zelanda)', 'Max Crocombe (Nueva Zelanda)',
] as const;

export const WC2026_COLOMBIA_SQUAD = [
  'Camilo Vargas', 'Álvaro Montero', 'David Ospina', 'Devis Vásquez',
  'Daniel Muñoz', 'Santiago Arias', 'Yerry Mina', 'Davinson Sánchez',
  'Jhon Lucumí', 'Johan Mojica', 'Cristian Borja', 'Óscar Murillo',
  'James Rodríguez', 'Richard Ríos', 'Jhon Arias', 'Mateus Uribe',
  'Juan Fernando Quintero', 'Wilmar Barrios', 'Gustavo Puerta',
  'Luis Díaz', 'Cucho Hernández', 'Rafael Santos Borré',
  'Jhon Córdoba', 'Dayro Moreno', 'Déiver Machado', 'Carlos Cuesta',
] as const;
