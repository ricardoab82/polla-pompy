-- Returns aggregated current-week bonus points per active user.
-- SECURITY DEFINER runs as the function owner (bypasses RLS) so all
-- rows in bonus_answers are visible regardless of the caller's role.
CREATE OR REPLACE FUNCTION get_current_week_bonus()
RETURNS TABLE(user_id uuid, display_name text, bonus_pts bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT u.id, u.display_name, COALESCE(SUM(ba.points_earned), 0) AS bonus_pts
  FROM public.users u
  LEFT JOIN public.bonus_answers ba ON ba.user_id = u.id AND ba.week_number IS NULL
  WHERE u.is_active = true
  GROUP BY u.id, u.display_name
  ORDER BY bonus_pts DESC;
$$;
