-- Migration 007: Add answer_type to bonus_questions
-- Supports structured answer types: text | yes_no | team | number
-- Existing rows default to 'text' (existing behaviour preserved).

ALTER TABLE public.bonus_questions
  ADD COLUMN IF NOT EXISTS answer_type TEXT NOT NULL DEFAULT 'text';

-- Optional: enforce valid values
ALTER TABLE public.bonus_questions
  ADD CONSTRAINT bonus_questions_answer_type_check
  CHECK (answer_type IN ('text', 'yes_no', 'team', 'number'));
