-- =============================================================
-- Bracket progression setup: Round of 32 → Round of 16
-- 2026 World Cup
--
-- Run this AFTER:
--   1. supabase/migrations/012_bracket_progression.sql is applied
--   2. scripts/insert_round_of_32.sql is applied
--
-- What this does:
--   A) Inserts 8 Round of 16 placeholder matches (TBD vs TBD)
--   B) Sets next_match_id + next_match_position on each R32 match
--      so winners auto-advance when calculateMatchPoints() runs.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- A) Insert Round of 16 placeholders
--    api_match_id range 9901001–9901008 (above R32 range 9900001+)
--    Dates are approximate UTC — update if official schedule differs
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.matches
  (api_match_id, home_team, away_team, kickoff_utc, phase, status, is_colombia_match)
VALUES
  (9901001, 'TBD', 'TBD', '2026-07-06T17:00:00Z', 'round_of_16', 'scheduled', false),
  (9901002, 'TBD', 'TBD', '2026-07-06T21:00:00Z', 'round_of_16', 'scheduled', false),
  (9901003, 'TBD', 'TBD', '2026-07-07T17:00:00Z', 'round_of_16', 'scheduled', false),
  (9901004, 'TBD', 'TBD', '2026-07-07T21:00:00Z', 'round_of_16', 'scheduled', false),
  (9901005, 'TBD', 'TBD', '2026-07-08T17:00:00Z', 'round_of_16', 'scheduled', false),
  (9901006, 'TBD', 'TBD', '2026-07-08T21:00:00Z', 'round_of_16', 'scheduled', false),
  (9901007, 'TBD', 'TBD', '2026-07-09T17:00:00Z', 'round_of_16', 'scheduled', false),
  (9901008, 'TBD', 'TBD', '2026-07-09T21:00:00Z', 'round_of_16', 'scheduled', false)
ON CONFLICT (api_match_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- B) Wire R32 → R16 bracket links
--
--   Bracket pairing (2026 WC official bracket):
--     R32 M1  (Brazil/Japan)         → R16 M1 as HOME
--     R32 M2  (Ivory Coast/Norway)   → R16 M1 as AWAY
--     R32 M3  (Mexico/Ecuador)       → R16 M2 as HOME
--     R32 M4  (England/DR Congo)     → R16 M2 as AWAY
--     R32 M5  (Belgium/TBD)          → R16 M3 as HOME
--     R32 M6  (Australia/Egypt)      → R16 M3 as AWAY
--     R32 M7  (Switzerland/TBD)      → R16 M4 as HOME
--     R32 M8  (Argentina/Cape Verde) → R16 M4 as AWAY
--     R32 M9  (Colombia/Ghana)       → R16 M5 as HOME
--     R32 M10–M16: uncomment once those matches are inserted
-- ─────────────────────────────────────────────────────────────
WITH r16_ids AS (
  SELECT api_match_id, id FROM public.matches WHERE phase = 'round_of_16'
)
UPDATE public.matches r32
SET
  next_match_id       = r16_ids.id,
  next_match_position = v.position
FROM (VALUES
  (9900001, 9901001, 'home'::text),
  (9900002, 9901001, 'away'::text),
  (9900003, 9901002, 'home'::text),
  (9900004, 9901002, 'away'::text),
  (9900005, 9901003, 'home'::text),
  (9900006, 9901003, 'away'::text),
  (9900007, 9901004, 'home'::text),
  (9900008, 9901004, 'away'::text),
  (9900009, 9901005, 'home'::text)
  -- Add remaining R32 matches once inserted:
  -- (9900010, 9901005, 'away'::text),
  -- (9900011, 9901006, 'home'::text),
  -- (9900012, 9901006, 'away'::text),
  -- (9900013, 9901007, 'home'::text),
  -- (9900014, 9901007, 'away'::text),
  -- (9900015, 9901008, 'home'::text),
  -- (9900016, 9901008, 'away'::text)
) AS v(r32_api_id, r16_api_id, position)
JOIN r16_ids ON r16_ids.api_match_id = v.r16_api_id
WHERE r32.api_match_id = v.r32_api_id
  AND r32.phase = 'round_of_32';

-- ─────────────────────────────────────────────────────────────
-- Verify: should return one row per R32 match that was linked
-- ─────────────────────────────────────────────────────────────
SELECT m.api_match_id, m.home_team, m.away_team, m.next_match_position,
       n.api_match_id AS next_api_id, n.phase AS next_phase
FROM public.matches m
JOIN public.matches n ON n.id = m.next_match_id
WHERE m.phase = 'round_of_32'
ORDER BY m.api_match_id;
