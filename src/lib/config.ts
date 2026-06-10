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
  // Argentina
  'Emiliano Martínez (Argentina)', 'Gerónimo Rulli (Argentina)', 'Juan Musso (Argentina)',
  // Australia
  'Mathew Ryan (Australia)', 'Paul Izzo (Australia)', 'Patrick Beach (Australia)',
  // Austria
  'Patrick Pentz (Austria)', 'Alexander Schlager (Austria)', 'Florian Wiegele (Austria)',
  // Belgium
  'Thibaut Courtois (Bélgica)', 'Senne Lammens (Bélgica)', 'Mike Penders (Bélgica)',
  // Bosnia
  'Nikola Vasilj (Bosnia)', 'Martin Zlomislic (Bosnia)', 'Osman Hadzikic (Bosnia)',
  // Brazil
  'Alisson (Brasil)', 'Ederson (Brasil)', 'Weverton (Brasil)',
  // Canada
  'Dayne St Clair (Canadá)', 'Maxime Crepeau (Canadá)', 'Owen Goodman (Canadá)',
  // Cape Verde
  'Vozinha (Cabo Verde)', 'Marcio Rosa (Cabo Verde)', 'CJ dos Santos (Cabo Verde)',
  // Colombia
  'Camilo Vargas (Colombia)', 'Álvaro Montero (Colombia)', 'David Ospina (Colombia)',
  // Costa Rica
  'Patrick Pemberton (Costa Rica)', 'Esteban Alvarado (Costa Rica)', 'Aaron Cruz (Costa Rica)',
  // Croatia
  'Dominik Livaković (Croacia)', 'Dominik Kotarski (Croacia)', 'Ivor Pandur (Croacia)',
  // Curacao
  'Eloy Room (Curazao)', 'Tyrick Bodack (Curazao)', 'Trevor Doornbusch (Curazao)',
  // Czechia
  'Jindřich Staněk (Chequia)', 'Matěj Kovář (Chequia)', 'Lukáš Horníček (Chequia)',
  // DR Congo
  'Matthieu Epolo (R.D. Congo)', 'Timothy Fayulu (R.D. Congo)', 'Lionel Mpasi (R.D. Congo)',
  // Ecuador
  'Hernán Galíndez (Ecuador)', 'Moisés Ramírez (Ecuador)', 'Gonzalo Valle (Ecuador)',
  // Egypt
  'Mohamed El Shenawy (Egipto)', 'Mostafa Shobeir (Egipto)', 'El Mahdy Soliman (Egipto)',
  // England
  'Jordan Pickford (Inglaterra)', 'Dean Henderson (Inglaterra)', 'James Trafford (Inglaterra)',
  // France
  'Mike Maignan (Francia)', 'Brice Samba (Francia)', 'Robin Risser (Francia)',
  // Germany
  'Manuel Neuer (Alemania)', 'Oliver Baumann (Alemania)', 'Alexander Nübel (Alemania)',
  // Ghana
  'Lawrence Ati-Zigi (Ghana)', 'Joseph Anang (Ghana)', 'Benjamin Asare (Ghana)',
  // Haiti
  'Johny Placide (Haití)', 'Alexandre Pierre (Haití)', 'Josue Duverger (Haití)',
  // Honduras
  'Harold Fonseca (Honduras)', 'Edrick Menjívar (Honduras)', 'Kevin Caballero (Honduras)',
  // Indonesia
  'Ernando Ari (Indonesia)', 'Cahya Supriadi (Indonesia)', 'Syahrul Trisna (Indonesia)',
  // Iran
  'Alireza Beiranvand (Irán)', 'Seyed Hossein Hosseini (Irán)', 'Payam Niazmand (Irán)',
  // Iraq
  'Fahad Talib (Irak)', 'Jalal Hassan (Irak)', 'Ahmed Basil (Irak)',
  // Ivory Coast
  'Yahia Fofana (Costa de Marfil)', 'Alban Lafont (Costa de Marfil)', 'Mohamed Kone (Costa de Marfil)',
  // Jamaica
  'Andre Blake (Jamaica)', 'Dillon Barnes (Jamaica)', 'Jahmali Waite (Jamaica)',
  // Japan
  'Zion Suzuki (Japón)', 'Keisuke Osako (Japón)', 'Tomoki Hayakawa (Japón)',
  // Jordan
  'Yazid Abulaila (Jordania)', 'Noor Bani Attiah (Jordania)', 'Abdallah Al Fakhouri (Jordania)',
  // Mexico
  'Raúl Rangel (México)', 'Guillermo Ochoa (México)', 'Carlos Acevedo (México)',
  // Morocco
  'Yassine Bounou (Marruecos)', 'Munir El Kajoui (Marruecos)', 'Ahmed Reda Tagnaouti (Marruecos)',
  // Netherlands
  'Bart Verbruggen (Países Bajos)', 'Mark Flekken (Países Bajos)', 'Robin Roefs (Países Bajos)',
  // New Zealand
  'Max Crocombe (Nueva Zelanda)', 'Michael Woud (Nueva Zelanda)', 'Alex Paulsen (Nueva Zelanda)',
  // Panama
  'Kevin Chamorro (Panamá)', 'Luis Mejía (Panamá)', 'Orlando Mosquera (Panamá)',
  // Portugal
  'Diogo Costa (Portugal)', 'José Sá (Portugal)', 'Rui Patrício (Portugal)',
  // Saudi Arabia
  'Mohammed Al-Owais (Arabia Saudita)', 'Mohammed Al-Rubaie (Arabia Saudita)', 'Fawaz Al-Qarni (Arabia Saudita)',
  // Senegal
  'Edouard Mendy (Senegal)', 'Seny Dieng (Senegal)', 'Boubacar Fall (Senegal)',
  // Serbia
  'Predrag Rajković (Serbia)', 'Vanja Milinković-Savić (Serbia)', 'Nikola Milovanović (Serbia)',
  // Slovakia
  'Marek Rodák (Eslovaquia)', 'Martin Dúbravka (Eslovaquia)', 'Henrich Ravas (Eslovaquia)',
  // South Africa
  'Ronwen Williams (Sudáfrica)', 'Ricardo Goss (Sudáfrica)', 'Sipho Chaine (Sudáfrica)',
  // South Korea
  'Kim Seung-gyu (Corea del Sur)', 'Jo Hyeon-woo (Corea del Sur)', 'Song Bum-keun (Corea del Sur)',
  // Spain
  'Unai Simón (España)', 'David Raya (España)', 'Álex Remiro (España)',
  // Switzerland
  'Yann Sommer (Suiza)', 'Yvon Mvogo (Suiza)', 'Jonas Omlin (Suiza)',
  // Turkey
  'Mert Günok (Turquía)', 'Altay Bayındır (Turquía)', 'Berke Özer (Turquía)',
  // Ukraine
  'Andriy Lunin (Ucrania)', 'Anatolii Trubin (Ucrania)', 'Georgiy Bushchan (Ucrania)',
  // United States
  'Chris Brady (Estados Unidos)', 'Matt Freese (Estados Unidos)', 'Matt Turner (Estados Unidos)',
  // Uruguay
  'Sergio Rochet (Uruguay)', 'Guillermo de Amores (Uruguay)', 'Santiago Mele (Uruguay)',
  // Uzbekistan
  'Eldorbek Sobirov (Uzbekistán)', 'Shohjahon Ergashev (Uzbekistán)', 'Alisher Umarov (Uzbekistán)',
] as const;

export const WC2026_COLOMBIA_SQUAD = [
  'Camilo Vargas', 'Álvaro Montero', 'David Ospina',
  'Dávinson Sánchez', 'Jhon Lucumí', 'Yerry Mina', 'Willer Ditta',
  'Daniel Muñoz', 'Santiago Arias', 'Johan Mojica', 'Déiver Machado',
  'Richard Ríos', 'Jefferson Lerma', 'Kevin Castaño', 'Juan Camilo Portilla',
  'Gustavo Puerta', 'Jhon Arias', 'Jorge Carrascal', 'Juan Fernando Quintero',
  'James Rodríguez', 'Jaminton Campaz',
  'Juan Camilo Hernández', 'Luis Díaz', 'Luis Suárez', 'Carlos Gómez', 'Jhon Córdoba',
] as const;
