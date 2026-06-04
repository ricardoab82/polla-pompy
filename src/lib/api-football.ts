// API-Football service layer
// All results written to Supabase first; UI always reads from Supabase.
// Tracks usage in daily_api_usage. Handles errors gracefully — never crashes cron.

import { createServiceClient } from '@/lib/supabase/server';
import type { MatchPhase, MatchStatus } from '@/lib/supabase/types';
import { COLOMBIA_TEAM_NAME } from '@/lib/config';
import staticFixtures from '@/lib/fixtures-2026.json';

const API_BASE   = 'https://v3.football.api-sports.io';
const API_KEY    = process.env.API_FOOTBALL_KEY!;

// ── API status → internal status mapping ───────────────────
const STATUS_MAP: Record<string, MatchStatus> = {
  TBD: 'scheduled', NS: 'scheduled',
  '1H': 'live', HT: 'live', '2H': 'live', ET: 'live',
  BT: 'live', P: 'live', INT: 'live',
  FT: 'finished', AET: 'finished', PEN: 'finished',
  PST: 'cancelled', CANC: 'cancelled', ABD: 'cancelled',
  AWD: 'cancelled', WO: 'cancelled',
};

// ── Phase mapping from round string ────────────────────────
function mapRound(round: string): MatchPhase {
  const r = round.toLowerCase();
  if (r.includes('group'))          return 'group';
  if (r.includes('32') || r.includes('round of 32')) return 'round_of_32';
  if (r.includes('16') || r.includes('round of 16')) return 'round_of_16';
  if (r.includes('quarter'))        return 'quarterfinal';
  if (r.includes('semi'))           return 'semifinal';
  if (r.includes('final'))          return 'final';
  return 'group';
}

// ── HTTP helper ─────────────────────────────────────────────
async function apiFetch(endpoint: string): Promise<unknown> {
  const url = `${API_BASE}${endpoint}`;
  console.log('[apiFetch] URL:', url);

  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
    },
    cache: 'no-store',
  });

  console.log('[apiFetch] Status:', res.status);

  const text = await res.text();
  console.log('[apiFetch] Body (first 500 chars):', text.slice(0, 500));

  if (!res.ok) {
    throw new Error(`API-Football ${res.status}: ${url}`);
  }

  const json = JSON.parse(text);
  await incrementApiUsage();
  return json;
}

// ── Usage tracking ─────────────────────────────────────────
export async function incrementApiUsage(): Promise<void> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  await supabase.rpc('increment_api_usage' as never, { p_date: today }).then(
    async () => {},
    async () => {
      // rpc not available; do upsert manually
      await supabase
        .from('daily_api_usage')
        .upsert({ date: today, call_count: 1, updated_at: new Date().toISOString() })
        .select();
    }
  );

  // Fallback upsert approach
  const { data } = await supabase
    .from('daily_api_usage')
    .select('id, call_count')
    .eq('date', today)
    .single();

  if (data) {
    await supabase
      .from('daily_api_usage')
      .update({ call_count: data.call_count + 1, updated_at: new Date().toISOString() })
      .eq('id', data.id);
  } else {
    await supabase
      .from('daily_api_usage')
      .insert({ date: today, call_count: 1, updated_at: new Date().toISOString() });
  }
}

export async function getTodayApiUsage(): Promise<number> {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('daily_api_usage')
    .select('call_count')
    .eq('date', today)
    .single();

  return data?.call_count ?? 0;
}

// ── syncAllFixtures ────────────────────────────────────────
// Reads from /lib/fixtures-2026.json (populated by /scripts/fetch-fixtures.ts).
// Run that script once to populate the JSON, then deploy.
export async function syncAllFixtures(): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  const fixtures = staticFixtures as StaticFixture[];

  if (fixtures.length === 0) {
    errors.push('fixtures-2026.json is empty — run scripts/fetch-fixtures.ts first');
    console.warn('[syncAllFixtures] No fixtures loaded. Run scripts/fetch-fixtures.ts to populate.');
    return { synced, errors };
  }

  const supabase = createServiceClient();

  for (const fixture of fixtures) {
    try {
      const { error } = await supabase
        .from('matches')
        .upsert(fixture, { onConflict: 'api_match_id' });

      if (error) {
        errors.push(`Match ${fixture.api_match_id}: ${error.message}`);
      } else {
        synced++;
      }
    } catch (err) {
      errors.push(`Match ${fixture.api_match_id}: ${String(err)}`);
    }
  }

  console.log(`[syncAllFixtures] Done. Synced: ${synced}, Errors: ${errors.length}`);
  return { synced, errors };
}

interface StaticFixture {
  api_match_id:      number;
  home_team:         string;
  away_team:         string;
  home_team_logo:    string;
  away_team_logo:    string;
  kickoff_utc:       string;
  phase:             MatchPhase;
  group_name:        string | null;
  status:            MatchStatus;
  home_score:        number | null;
  away_score:        number | null;
  is_colombia_match: boolean;
  updated_at:        string;
}

// ── pollLiveMatches ────────────────────────────────────────
// Only polls live or soon matches (within 2h of kickoff).
export async function pollLiveMatches(): Promise<{
  updated: number;
  finished: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const finished: string[] = [];
  let updated = 0;

  try {
    const supabase = createServiceClient();
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Get matches that are live OR kick off within 2 hours
    const { data: relevantMatches, error: queryErr } = await supabase
      .from('matches')
      .select('api_match_id, status, home_score, away_score')
      .or(`status.eq.live,and(status.eq.scheduled,kickoff_utc.lte.${twoHoursFromNow.toISOString()})`);

    if (queryErr) {
      errors.push(`DB query: ${queryErr.message}`);
      return { updated, finished, errors };
    }

    if (!relevantMatches?.length) return { updated, finished, errors };

    const ids = relevantMatches.map((m) => m.api_match_id).join('-');
    const data = await apiFetch(`/fixtures?ids=${ids}`) as { response: ApiFixture[] };

    for (const fixture of data.response ?? []) {
      try {
        const mapped = mapFixture(fixture);
        const prev = relevantMatches.find((m) => m.api_match_id === fixture.fixture.id);

        const { error } = await supabase
          .from('matches')
          .update({
            status: mapped.status,
            home_score: mapped.home_score,
            away_score: mapped.away_score,
            updated_at: new Date().toISOString(),
          })
          .eq('api_match_id', fixture.fixture.id);

        if (error) {
          errors.push(`Update ${fixture.fixture.id}: ${error.message}`);
        } else {
          updated++;
          if (
            mapped.status === 'finished' &&
            prev?.status !== 'finished' &&
            mapped.home_score !== null &&
            mapped.away_score !== null
          ) {
            finished.push(fixture.fixture.id.toString());
          }
        }
      } catch (err) {
        errors.push(`Fixture ${fixture.fixture.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`pollLiveMatches: ${String(err)}`);
    console.error('[pollLiveMatches] Failed:', err);
  }

  return { updated, finished, errors };
}

// ── getMatchResult ─────────────────────────────────────────
// Single match for manual admin verification.
export async function getMatchResult(apiMatchId: number): Promise<{
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
} | null> {
  try {
    const data = await apiFetch(`/fixtures?id=${apiMatchId}`) as { response: ApiFixture[] };
    const fixture = data.response?.[0];
    if (!fixture) return null;

    return {
      homeScore: fixture.score?.fulltime?.home ?? fixture.goals?.home ?? null,
      awayScore: fixture.score?.fulltime?.away ?? fixture.goals?.away ?? null,
      status: STATUS_MAP[fixture.fixture.status.short] ?? 'scheduled',
    };
  } catch (err) {
    console.error('[getMatchResult] Failed:', err);
    return null;
  }
}

// ── Internal fixture mapper ─────────────────────────────────
interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
  };
  league: {
    round: string;
    group?: string;
  };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    fulltime: { home: number | null; away: number | null };
  };
}

function mapFixture(f: ApiFixture) {
  const status = STATUS_MAP[f.fixture.status.short] ?? 'scheduled';
  const phase  = mapRound(f.league.round);
  const homeTeam = f.teams.home.name;
  const awayTeam = f.teams.away.name;

  // Use fulltime score if available, else goals
  const homeScore = f.score?.fulltime?.home ?? f.goals?.home ?? null;
  const awayScore = f.score?.fulltime?.away ?? f.goals?.away ?? null;

  return {
    api_match_id:      f.fixture.id,
    home_team:         homeTeam,
    away_team:         awayTeam,
    home_team_logo:    f.teams.home.logo,
    away_team_logo:    f.teams.away.logo,
    kickoff_utc:       f.fixture.date,
    phase,
    group_name:        f.league.group ?? null,
    status,
    home_score:        status === 'finished' ? homeScore : null,
    away_score:        status === 'finished' ? awayScore : null,
    is_colombia_match:
      homeTeam === COLOMBIA_TEAM_NAME || awayTeam === COLOMBIA_TEAM_NAME,
    updated_at:        new Date().toISOString(),
  };
}
