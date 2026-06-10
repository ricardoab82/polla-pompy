-- ============================================================
-- 004_rename_golden_glove.sql
-- La Polla de Pompy — FIFA World Cup 2026
-- Renames golden_glove → fourth_place (pick changed from
-- Guante de Oro to Cuarto puesto del torneo).
-- ============================================================

-- Step 1: Rename value and pts columns
ALTER TABLE public.special_picks RENAME COLUMN golden_glove     TO fourth_place;
ALTER TABLE public.special_picks RENAME COLUMN golden_glove_pts TO fourth_place_pts;

-- Step 2: Recreate total_special_pts to reference the renamed pts column.
DROP VIEW IF EXISTS public.leaderboard;

ALTER TABLE public.special_picks DROP COLUMN total_special_pts;
ALTER TABLE public.special_picks ADD COLUMN total_special_pts INTEGER GENERATED ALWAYS AS (
  COALESCE(champion_pts, 0) +
  COALESCE(runner_up_pts, 0) +
  COALESCE(top_scorer_pts, 0) +
  COALESCE(golden_ball_pts, 0) +
  COALESCE(fourth_place_pts, 0) +
  COALESCE(best_defense_pts, 0) +
  COALESCE(colombia_eliminated_pts, 0) +
  COALESCE(colombia_top_scorer_pts, 0)
) STORED;

-- Step 3: Recreate leaderboard view
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
