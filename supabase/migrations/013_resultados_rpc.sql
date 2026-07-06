-- RPC used by /resultados page to fetch all picks for finished matches.
-- SECURITY DEFINER bypasses RLS (picks table restricts reads to own rows).
-- Returns a plain result set — no URL-length or row-cap issues from PostgREST IN clauses.

CREATE OR REPLACE FUNCTION get_all_picks_for_resultados()
RETURNS TABLE(
  user_id          uuid,
  match_id         uuid,
  home_pick        integer,
  away_pick        integer,
  points_earned    integer,
  is_auto_assigned boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.user_id,
    p.match_id,
    p.home_pick,
    p.away_pick,
    p.points_earned,
    p.is_auto_assigned
  FROM public.picks p
  JOIN public.matches m ON m.id = p.match_id
  WHERE m.status = 'finished';
$$;
