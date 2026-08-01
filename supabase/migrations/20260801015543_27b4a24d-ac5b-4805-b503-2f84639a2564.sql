ALTER TABLE public.test_attempts
  ADD COLUMN IF NOT EXISTS subject_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS submission jsonb;