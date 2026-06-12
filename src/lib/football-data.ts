// football-data.org service layer
// Replaces API-Football for live polling and result sync.
// Matches Supabase records by normalized team names (case-insensitive, punctuation-stripped).

import { createServiceClient } from '@/lib/supabase/server';
import type { MatchStatus } from '@/lib/supabase/types';

const FD_BASE = 'https://api.football-data.org/v4';

const STATUS_MAP: Record<string, MatchStatus> = {
  SCHEDULED: 'scheduled',
  TIMED:     'scheduled',
  IN_PLAY:   'live',
  PAUSED:    'live',
  LIVE:      'live',
  FINISHED:  'finished',
  POSTPONED: 'cancelled',
  CANCELLED: 'cancelled',
  SUSPENDED: 'cancelled',
};

interface FdMatch {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  status: string;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

interface FdResponse {
  matches: FdMatch[];
}

async function fdFetch(path: string): Promise<FdResponse> {
  const url = `${FD_BASE}${path}`;
  console.log('[football-data] GET', url);

  const res = await fetch(url, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<FdResponse>;
}

// Normalize team name for fuzzy matching (lowercase, alphanumeric only)
function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── pollLiveMatches ────────────────────────────────────────
// Fetches all currently LIVE matches from football-data.org and syncs to Supabase.
// Returns Supabase match UUIDs for newly-finished matches so points can be calculated.
export async function pollLiveMatches(): Promise<{
  updated: number;
  finished: string[]; // Supabase match UUIDs
  errors: string[];
}> {
  const errors: string[] = [];
  const finished: string[] = [];
  let updated = 0;

  try {
    const supabase = createServiceClient();

    const data = await fdFetch('/competitions/WC/matches?status=LIVE');
    const liveMatches = data.matches ?? [];
    console.log(`[pollLiveMatches] ${liveMatches.length} live match(es) from football-data.org`);

    if (!liveMatches.length) return { updated, finished, errors };

    // Load all active Supabase matches for in-memory name matching
    const { data: dbMatches, error: dbErr } = await supabase
      .from('matches')
      .select('id, home_team, away_team, status')
      .in('status', ['scheduled', 'live']);

    if (dbErr) {
      errors.push(`DB query: ${dbErr.message}`);
      return { updated, finished, errors };
    }

    for (const fdMatch of liveMatches) {
      try {
        const mappedStatus = STATUS_MAP[fdMatch.status] ?? 'live';
        const homeScore    = fdMatch.score.fullTime.home;
        const awayScore    = fdMatch.score.fullTime.away;

        const fdHome = normalize(fdMatch.homeTeam.name);
        const fdAway = normalize(fdMatch.awayTeam.name);

        const dbMatch = dbMatches?.find(
          (m) => normalize(m.home_team) === fdHome && normalize(m.away_team) === fdAway,
        );

        if (!dbMatch) {
          errors.push(`No DB match for: ${fdMatch.homeTeam.name} vs ${fdMatch.awayTeam.name}`);
          continue;
        }

        const prevStatus = dbMatch.status;

        const { error: updateErr } = await supabase
          .from('matches')
          .update({
            status:     mappedStatus,
            home_score: homeScore,
            away_score: awayScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dbMatch.id);

        if (updateErr) {
          errors.push(`Update ${dbMatch.id}: ${updateErr.message}`);
        } else {
          updated++;
          if (mappedStatus === 'finished' && prevStatus !== 'finished') {
            finished.push(dbMatch.id);
          }
        }
      } catch (err) {
        errors.push(`FD match ${fdMatch.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`pollLiveMatches: ${String(err)}`);
    console.error('[pollLiveMatches] Failed:', err);
  }

  return { updated, finished, errors };
}

// ── syncFinishedMatches ────────────────────────────────────
// Fetches all FINISHED matches and updates scores in Supabase.
// Used by the daily sync-fixtures cron.
export async function syncFinishedMatches(): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const supabase = createServiceClient();

    const data = await fdFetch('/competitions/WC/matches?status=FINISHED');
    const finishedMatches = data.matches ?? [];
    console.log(`[syncFinishedMatches] ${finishedMatches.length} finished match(es) from football-data.org`);

    if (!finishedMatches.length) return { synced, errors };

    // Load all Supabase matches for name matching
    const { data: dbMatches, error: dbErr } = await supabase
      .from('matches')
      .select('id, home_team, away_team');

    if (dbErr) {
      errors.push(`DB query: ${dbErr.message}`);
      return { synced, errors };
    }

    for (const fdMatch of finishedMatches) {
      try {
        const homeScore = fdMatch.score.fullTime.home;
        const awayScore = fdMatch.score.fullTime.away;

        // Skip if full-time score not yet available
        if (homeScore === null || awayScore === null) continue;

        const fdHome = normalize(fdMatch.homeTeam.name);
        const fdAway = normalize(fdMatch.awayTeam.name);

        const dbMatch = dbMatches?.find(
          (m) => normalize(m.home_team) === fdHome && normalize(m.away_team) === fdAway,
        );

        if (!dbMatch) {
          errors.push(`No DB match for: ${fdMatch.homeTeam.name} vs ${fdMatch.awayTeam.name}`);
          continue;
        }

        const { error: updateErr } = await supabase
          .from('matches')
          .update({
            status:     'finished',
            home_score: homeScore,
            away_score: awayScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dbMatch.id);

        if (updateErr) {
          errors.push(`Update ${dbMatch.id}: ${updateErr.message}`);
        } else {
          synced++;
        }
      } catch (err) {
        errors.push(`FD match ${fdMatch.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`syncFinishedMatches: ${String(err)}`);
    console.error('[syncFinishedMatches] Failed:', err);
  }

  return { synced, errors };
}
