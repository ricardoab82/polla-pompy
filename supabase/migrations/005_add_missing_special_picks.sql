-- ============================================================
-- 005_add_missing_special_picks.sql
-- La Polla de Pompy — FIFA World Cup 2026
-- Adds golden_glove (re-added as free text) and third_place.
-- Recreates total_special_pts to cover all 9 picks.
-- ============================================================

-- Step 1: Add new columns
ALTER TABLE public.special_picks
  ADD COLUMN IF NOT EXISTS golden_glove      TEXT,
  ADD COLUMN IF NOT EXISTS golden_glove_pts  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS third_place       TEXT,
  ADD COLUMN IF NOT EXISTS third_place_pts   INTEGER DEFAULT 0;

-- Step 2: Recreate total_special_pts (DROP CASCADE drops leaderboard view)
ALTER TABLE public.special_picks
  DROP COLUMN IF EXISTS total_special_pts CASCADE;

ALTER TABLE public.special_picks
  ADD COLUMN total_special_pts INTEGER GENERATED ALWAYS AS (
    COALESCE(champion_pts, 0) +
    COALESCE(runner_up_pts, 0) +
    COALESCE(third_place_pts, 0) +
    COALESCE(fourth_place_pts, 0) +
    COALESCE(top_scorer_pts, 0) +
    COALESCE(golden_ball_pts, 0) +
    COALESCE(golden_glove_pts, 0) +
    COALESCE(colombia_eliminated_pts, 0) +
    COALESCE(colombia_top_scorer_pts, 0)
  ) STORED;

-- Step 3: Recreate leaderboard view (was dropped by CASCADE above)
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  u.id                                               AS user_id,
  u.display_name,
  u.avatar_url,
  COALESCE(SUM(CASE WHEN m.phase = 'group'
    THEN p.points_earned END), 0)                    AS group_pts,
  COALESCE(SUM(CASE WHEN m.phase != 'group'
    THEN p.points_earned END), 0)                    AS knockout_pts,
  COALESCE(SUM(ba.points_earned), 0)                 AS bonus_pts,
  COALESCE(sp.total_special_pts, 0)                  AS special_pts,
  (
    COALESCE(SUM(p.points_earned), 0) +
    COALESCE(SUM(ba.points_earned), 0) +
    COALESCE(sp.total_special_pts, 0)
  )                                                   AS total_points,
  COUNT(CASE
    WHEN p.home_pick = m.home_score
     AND p.away_pick = m.away_score
     AND p.is_auto_assigned = false
    THEN 1 END)                                       AS exact_results_count,
  RANK() OVER (ORDER BY (
    COALESCE(SUM(p.points_earned), 0) +
    COALESCE(SUM(ba.points_earned), 0) +
    COALESCE(sp.total_special_pts, 0)
  ) DESC)                                             AS rank
FROM public.users u
LEFT JOIN public.picks p          ON p.user_id = u.id
LEFT JOIN public.matches m        ON m.id = p.match_id
LEFT JOIN public.bonus_answers ba ON ba.user_id = u.id
LEFT JOIN public.special_picks sp ON sp.user_id = u.id
WHERE u.is_active = true
GROUP BY u.id, u.display_name, u.avatar_url, sp.total_special_pts;
