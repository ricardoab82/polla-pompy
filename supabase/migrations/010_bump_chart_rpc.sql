-- RPC for bump chart data: one data point per finished match,
-- using the position_history snapshot closest to each match's end.
-- Runs as SECURITY DEFINER to read across RLS boundaries (read-only).

CREATE OR REPLACE FUNCTION public.get_bump_chart_data()
RETURNS TABLE (
  match_order  integer,
  x_label      text,
  user_id      uuid,
  display_name text,
  user_position integer,
  total_points integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  -- All distinct snapshot timestamps that exist in position_history
  snap_times AS (
    SELECT DISTINCT snapshot_at FROM position_history
  ),
  -- For each finished match, pick the single snapshot closest to
  -- kickoff + 100 minutes (estimated end).  The LATERAL + LIMIT 1
  -- trick avoids any timezone string manipulation.
  match_snaps AS (
    SELECT DISTINCT ON (m.id)
      m.id           AS match_id,
      m.kickoff_utc,
      TO_CHAR(
        (m.kickoff_utc AT TIME ZONE 'America/Bogota'),
        'DD Mon'
      )              AS x_label,
      s.snapshot_at
    FROM matches m
    CROSS JOIN LATERAL (
      SELECT snapshot_at
      FROM   snap_times
      ORDER  BY ABS(EXTRACT(EPOCH FROM (
               snapshot_at - (m.kickoff_utc + INTERVAL '100 minutes')
             )))
      LIMIT  1
    ) s
    WHERE m.status = 'finished'
    ORDER BY m.id
  ),
  -- Add a stable chronological order number (ROW_NUMBER after DISTINCT ON)
  match_snaps_ordered AS (
    SELECT
      ms.*,
      ROW_NUMBER() OVER (ORDER BY ms.kickoff_utc) AS match_order
    FROM match_snaps ms
  )
  SELECT
    mso.match_order :: integer,
    mso.x_label,
    ph.user_id,
    u.display_name,
    ph.position AS user_position,
    ph.total_points
  FROM   match_snaps_ordered  mso
  JOIN   position_history     ph  ON  ph.snapshot_at = mso.snapshot_at
  JOIN   users                u   ON  u.id           = ph.user_id
  WHERE  u.is_active = true
  ORDER  BY mso.match_order, ph.position;
$$;
