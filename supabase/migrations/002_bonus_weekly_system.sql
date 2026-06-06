-- ============================================================
-- 002_bonus_weekly_system.sql
-- La Polla de Pompy — Bonus weekly system
-- Additive only. Never DROP, never ALTER existing columns.
-- ============================================================

-- Add week_number to matches (set by admin or calculated from match date)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- Add week_number to bonus_answers (assigned when week is closed)
ALTER TABLE public.bonus_answers
  ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- ── bonus_weekly_standings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_weekly_standings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number            INTEGER NOT NULL,
  week_start             DATE NOT NULL,
  week_end               DATE NOT NULL,  -- always a Sunday
  user_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bonus_points_this_week INTEGER NOT NULL DEFAULT 0,
  rank                   INTEGER NOT NULL DEFAULT 0,
  sponsor_prize          TEXT,
  finalized              BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_number, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bonus_weekly_user_id     ON public.bonus_weekly_standings(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_weekly_week_number ON public.bonus_weekly_standings(week_number);

-- ── RLS for bonus_weekly_standings ─────────────────────────
ALTER TABLE public.bonus_weekly_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bonus_weekly_select"
  ON public.bonus_weekly_standings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bonus_weekly_admin_write"
  ON public.bonus_weekly_standings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'co-admin')
    )
  );

-- ── Update leaderboard VIEW ─────────────────────────────────
-- bonus_pts kept as display column but EXCLUDED from total_points
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
    COALESCE(sp.total_special_pts, 0)
  )                                                   AS total_points,
  COUNT(CASE
    WHEN p.home_pick = m.home_score
     AND p.away_pick = m.away_score
     AND p.is_auto_assigned = false
    THEN 1 END)                                       AS exact_results_count,
  RANK() OVER (ORDER BY (
    COALESCE(SUM(p.points_earned), 0) +
    COALESCE(sp.total_special_pts, 0)
  ) DESC)                                             AS rank
FROM public.users u
LEFT JOIN public.picks p          ON p.user_id = u.id
LEFT JOIN public.matches m        ON m.id = p.match_id
LEFT JOIN public.bonus_answers ba ON ba.user_id = u.id
LEFT JOIN public.special_picks sp ON sp.user_id = u.id
WHERE u.is_active = true
GROUP BY u.id, u.display_name, u.avatar_url, sp.total_special_pts;
