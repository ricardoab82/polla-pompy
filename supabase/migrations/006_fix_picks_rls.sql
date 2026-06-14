-- Migration 006: Enforce lock time on picks and bonus_answers via RLS
-- Users may only INSERT/UPDATE when the match is scheduled and
-- kickoff is more than 15 minutes away.

-- ── picks ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "picks_insert" ON public.picks;
DROP POLICY IF EXISTS "picks_update" ON public.picks;

CREATE POLICY "picks_insert"
  ON public.picks FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'scheduled'
        AND m.kickoff_utc > NOW() + INTERVAL '15 minutes'
    )
  );

CREATE POLICY "picks_update"
  ON public.picks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'scheduled'
        AND m.kickoff_utc > NOW() + INTERVAL '15 minutes'
    )
  );

-- ── bonus_answers ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bonus_answers_insert" ON public.bonus_answers;
DROP POLICY IF EXISTS "bonus_answers_update" ON public.bonus_answers;

CREATE POLICY "bonus_answers_insert"
  ON public.bonus_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.bonus_questions bq
      JOIN public.matches m ON m.id = bq.match_id
      WHERE bq.id = question_id
        AND m.status = 'scheduled'
        AND m.kickoff_utc > NOW() + INTERVAL '15 minutes'
    )
  );

CREATE POLICY "bonus_answers_update"
  ON public.bonus_answers FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.bonus_questions bq
      JOIN public.matches m ON m.id = bq.match_id
      WHERE bq.id = question_id
        AND m.status = 'scheduled'
        AND m.kickoff_utc > NOW() + INTERVAL '15 minutes'
    )
  );
