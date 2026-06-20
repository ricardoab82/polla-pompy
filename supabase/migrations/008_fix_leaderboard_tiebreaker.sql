-- Fix leaderboard tiebreaker ordering
-- RANK() now uses: total_points DESC, exact_results_count DESC, bonus_pts DESC

CREATE OR REPLACE VIEW public.leaderboard AS
WITH base AS (
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
      THEN 1 END)                                       AS exact_results_count
  FROM public.users u
  LEFT JOIN public.picks p          ON p.user_id = u.id
  LEFT JOIN public.matches m        ON m.id = p.match_id
  LEFT JOIN public.bonus_answers ba ON ba.user_id = u.id
  LEFT JOIN public.special_picks sp ON sp.user_id = u.id
  WHERE u.is_active = true
  GROUP BY u.id, u.display_name, u.avatar_url, sp.total_special_pts
)
SELECT
  user_id,
  display_name,
  avatar_url,
  group_pts,
  knockout_pts,
  bonus_pts,
  special_pts,
  total_points,
  exact_results_count,
  RANK() OVER (
    ORDER BY
      total_points       DESC,
      exact_results_count DESC,
      bonus_pts          DESC
  ) AS rank
FROM base;
