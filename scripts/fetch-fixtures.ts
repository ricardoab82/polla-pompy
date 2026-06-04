/**
 * Fetches all FIFA World Cup 2026 fixtures from football-data.org
 * and writes them to src/lib/fixtures-2026.json.
 *
 * Usage:
 *   npx tsx scripts/fetch-fixtures.ts
 *
 * Requires:
 *   FOOTBALL_DATA_API_KEY in .env (free tier at https://www.football-data.org/client/register)
 *
 * football-data.org free tier includes World Cup (competition code: WC).
 * Endpoint: GET /v4/competitions/WC/matches?season=2026
 */

import * as fs   from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY  = process.env.FOOTBALL_DATA_API_KEY;
const OUT_FILE = path.resolve(__dirname, '../src/lib/fixtures-2026.json');

if (!API_KEY) {
  console.error('Missing FOOTBALL_DATA_API_KEY in .env');
  process.exit(1);
}

const PHASE_MAP: Record<string, string> = {
  'GROUP_STAGE':      'group',
  'LAST_32':          'round_of_32',
  'ROUND_OF_16':      'round_of_16',
  'QUARTER_FINALS':   'quarterfinal',
  'SEMI_FINALS':      'semifinal',
  'FINAL':            'final',
};

const STATUS_MAP: Record<string, string> = {
  'SCHEDULED':  'scheduled',
  'TIMED':      'scheduled',
  'IN_PLAY':    'live',
  'PAUSED':     'live',
  'FINISHED':   'finished',
  'SUSPENDED':  'cancelled',
  'CANCELLED':  'cancelled',
  'POSTPONED':  'cancelled',
};

interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: { name: string; crest: string };
  awayTeam: { name: string; crest: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

async function main() {
  console.log('Fetching WC 2026 fixtures from football-data.org...');

  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': API_KEY! } }
  );

  console.log('Status:', res.status);

  if (!res.ok) {
    const body = await res.text();
    console.error('Error response:', body.slice(0, 500));
    process.exit(1);
  }

  const data = await res.json() as { matches: FDMatch[] };
  console.log(`Fetched ${data.matches.length} matches`);

  const COLOMBIA = 'Colombia';

  const fixtures = data.matches.map((m) => {
    const phase      = PHASE_MAP[m.stage] ?? 'group';
    const status     = STATUS_MAP[m.status] ?? 'scheduled';
    const isFinished = status === 'finished';

    return {
      api_match_id:      m.id,
      home_team:         m.homeTeam.name,
      away_team:         m.awayTeam.name,
      home_team_logo:    m.homeTeam.crest ?? '',
      away_team_logo:    m.awayTeam.crest ?? '',
      kickoff_utc:       m.utcDate,
      phase,
      group_name:        m.group ?? null,
      status,
      home_score:        isFinished ? (m.score.fullTime.home ?? null) : null,
      away_score:        isFinished ? (m.score.fullTime.away ?? null) : null,
      is_colombia_match: m.homeTeam.name === COLOMBIA || m.awayTeam.name === COLOMBIA,
      updated_at:        new Date().toISOString(),
    };
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify(fixtures, null, 2));
  console.log(`Written ${fixtures.length} fixtures to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
