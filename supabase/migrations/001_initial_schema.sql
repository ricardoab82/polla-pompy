-- ============================================================
-- 001_initial_schema.sql
-- La Polla de Pompy — FIFA World Cup 2026
-- All additive. Never DROP, never ALTER existing columns.
-- ============================================================

-- ── users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL,
  display_name            TEXT NOT NULL,
  avatar_url              TEXT,
  role                    TEXT NOT NULL DEFAULT 'participant'
                            CHECK (role IN ('participant', 'co-admin', 'admin')),
  auth_provider           TEXT NOT NULL DEFAULT 'email'
                            CHECK (auth_provider IN ('email', 'google')),
  special_picks_submitted BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active               BOOLEAN NOT NULL DEFAULT true
);

-- ── matches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_match_id     INTEGER NOT NULL UNIQUE,
  home_team        TEXT NOT NULL,
  away_team        TEXT NOT NULL,
  home_team_logo   TEXT,
  away_team_logo   TEXT,
  kickoff_utc      TIMESTAMPTZ NOT NULL,
  phase            TEXT NOT NULL
                     CHECK (phase IN ('group','round_of_32','round_of_16',
                                      'quarterfinal','semifinal','final')),
  group_name       TEXT,
  status           TEXT NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','live','finished','cancelled')),
  home_score       INTEGER,
  away_score       INTEGER,
  is_colombia_match BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_status        ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff_utc   ON public.matches(kickoff_utc);
CREATE INDEX IF NOT EXISTS idx_matches_phase         ON public.matches(phase);

-- ── picks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.picks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id         UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_pick        INTEGER NOT NULL,
  away_pick        INTEGER NOT NULL,
  is_auto_assigned BOOLEAN NOT NULL DEFAULT false,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at        TIMESTAMPTZ,
  points_earned    INTEGER,
  UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_picks_user_id   ON public.picks(user_id);
CREATE INDEX IF NOT EXISTS idx_picks_match_id  ON public.picks(match_id);

-- ── special_picks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.special_picks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  champion        TEXT NOT NULL,
  runner_up       TEXT NOT NULL,
  top_scorer      TEXT NOT NULL,
  golden_ball     TEXT NOT NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  champion_pts    INTEGER,
  runner_up_pts   INTEGER,
  top_scorer_pts  INTEGER,
  golden_ball_pts INTEGER,
  total_special_pts INTEGER GENERATED ALWAYS AS (
    COALESCE(champion_pts, 0) +
    COALESCE(runner_up_pts, 0) +
    COALESCE(top_scorer_pts, 0) +
    COALESCE(golden_ball_pts, 0)
  ) STORED
);

-- ── bonus_questions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  correct_answer TEXT,
  points_value   INTEGER NOT NULL DEFAULT 1,
  created_by     UUID NOT NULL REFERENCES public.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bonus_questions_match_id ON public.bonus_questions(match_id);

-- ── bonus_answers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES public.bonus_questions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answer       TEXT NOT NULL,
  is_correct   BOOLEAN,
  points_earned INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bonus_answers_user_id     ON public.bonus_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_answers_question_id ON public.bonus_answers(question_id);

-- ── position_history ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.position_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  snapshot_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  position     INTEGER NOT NULL,
  total_points INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_position_history_user_id ON public.position_history(user_id);

-- ── daily_api_usage ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_api_usage (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── reminders_sent ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminders_sent (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sent_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

-- ── leaderboard VIEW ───────────────────────────────────────
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
LEFT JOIN public.picks p         ON p.user_id = u.id
LEFT JOIN public.matches m       ON m.id = p.match_id
LEFT JOIN public.bonus_answers ba ON ba.user_id = u.id
LEFT JOIN public.special_picks sp ON sp.user_id = u.id
WHERE u.is_active = true
GROUP BY u.id, u.display_name, u.avatar_url, sp.total_special_pts;

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_picks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_answers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_api_usage    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders_sent     ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select_authenticated"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- matches
CREATE POLICY "matches_select_authenticated"
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "matches_admin_write"
  ON public.matches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin','co-admin')
    )
  );

-- picks: own always; others only when match is not scheduled
CREATE POLICY "picks_select_own"
  ON public.picks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "picks_select_others_post_kickoff"
  ON public.picks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id AND status != 'scheduled'
    )
  );

CREATE POLICY "picks_insert"
  ON public.picks FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id
        AND kickoff_utc - INTERVAL '1 hour' < now()
    )
  );

CREATE POLICY "picks_update"
  ON public.picks FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id
        AND kickoff_utc - INTERVAL '1 hour' < now()
    )
  );

-- special_picks: own always; others after tournament ends
CREATE POLICY "special_picks_select_own"
  ON public.special_picks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "special_picks_insert"
  ON public.special_picks FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    now() < TIMESTAMPTZ '2026-06-11 04:59:00+00'
  );

CREATE POLICY "special_picks_update"
  ON public.special_picks FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    now() < TIMESTAMPTZ '2026-06-11 04:59:00+00'
  );

-- bonus_questions
CREATE POLICY "bonus_questions_select"
  ON public.bonus_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "bonus_questions_admin_write"
  ON public.bonus_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin','co-admin')
    )
  );

-- bonus_answers: own always; others after kickoff
CREATE POLICY "bonus_answers_select_own"
  ON public.bonus_answers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bonus_answers_select_others_post_kickoff"
  ON public.bonus_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bonus_questions bq
      JOIN public.matches m ON m.id = bq.match_id
      WHERE bq.id = question_id AND m.status != 'scheduled'
    )
  );

CREATE POLICY "bonus_answers_insert"
  ON public.bonus_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM public.bonus_questions bq
      JOIN public.matches m ON m.id = bq.match_id
      WHERE bq.id = question_id
        AND m.kickoff_utc - INTERVAL '1 hour' < now()
    )
  );

CREATE POLICY "bonus_answers_update"
  ON public.bonus_answers FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM public.bonus_questions bq
      JOIN public.matches m ON m.id = bq.match_id
      WHERE bq.id = question_id
        AND m.kickoff_utc - INTERVAL '1 hour' < now()
    )
  );

-- position_history: all authenticated can read
CREATE POLICY "position_history_select"
  ON public.position_history FOR SELECT
  TO authenticated
  USING (true);

-- daily_api_usage + reminders_sent: service role only
CREATE POLICY "daily_api_usage_service"
  ON public.daily_api_usage FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "reminders_sent_service"
  ON public.reminders_sent FOR ALL
  TO service_role
  USING (true);

-- ── Auto-create user profile on signup ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN NEW.app_metadata->'providers' ? 'google' THEN 'google'
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
      ELSE 'email'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
