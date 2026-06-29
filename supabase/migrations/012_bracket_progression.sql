-- Bracket progression: when a knockout match finishes, the winner
-- automatically fills the home or away slot in the next match.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS next_match_id       uuid REFERENCES public.matches(id),
  ADD COLUMN IF NOT EXISTS next_match_position text CHECK (next_match_position IN ('home', 'away'));

-- Efficient lookup: "which matches feed into match X?"
CREATE INDEX IF NOT EXISTS idx_matches_next_match_id ON public.matches(next_match_id);
