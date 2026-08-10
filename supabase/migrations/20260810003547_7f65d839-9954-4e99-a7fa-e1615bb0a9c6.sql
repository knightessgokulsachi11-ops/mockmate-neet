CREATE TABLE public.question_mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  subject public.neet_subject NOT NULL,
  chapter text NOT NULL,
  major_topic text NOT NULL DEFAULT '',
  difficulty public.difficulty_level NOT NULL DEFAULT 'Medium',
  times_wrong integer NOT NULL DEFAULT 1,
  times_correct integer NOT NULL DEFAULT 0,
  last_answer char(1),
  last_wrong_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_mistakes TO authenticated;
GRANT ALL ON public.question_mistakes TO service_role;

ALTER TABLE public.question_mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own mistakes" ON public.question_mistakes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_question_mistakes_user ON public.question_mistakes (user_id, last_wrong_at DESC);
CREATE INDEX idx_question_mistakes_area ON public.question_mistakes (user_id, subject, chapter, major_topic);

CREATE OR REPLACE FUNCTION public.record_mistakes(_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.question_mistakes
    (user_id, question_id, subject, chapter, major_topic, difficulty, last_answer, last_wrong_at, resolved)
  SELECT auth.uid(), q.id, q.subject, q.chapter, q.major_topic, q.difficulty,
         nullif(i->>'answer','')::char(1), now(), false
  FROM jsonb_array_elements(_items) AS i
  JOIN public.questions q ON q.id = (i->>'question_id')::uuid
  WHERE auth.uid() IS NOT NULL
  ON CONFLICT (user_id, question_id) DO UPDATE
    SET times_wrong = public.question_mistakes.times_wrong + 1,
        last_answer = EXCLUDED.last_answer,
        last_wrong_at = now(),
        resolved = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_mistake_corrections(_question_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  UPDATE public.question_mistakes m
  SET times_correct = m.times_correct + 1,
      resolved = true
  WHERE m.user_id = auth.uid()
    AND m.question_id = ANY(_question_ids);
$$;

CREATE OR REPLACE FUNCTION public.weak_areas(_limit integer DEFAULT 20)
RETURNS TABLE(subject text, chapter text, major_topic text, mistakes bigint, questions bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT m.subject::text, m.chapter, m.major_topic,
         sum(m.times_wrong)::bigint AS mistakes,
         count(*)::bigint AS questions
  FROM public.question_mistakes m
  WHERE m.user_id = auth.uid()
  GROUP BY m.subject, m.chapter, m.major_topic
  ORDER BY mistakes DESC
  LIMIT greatest(1, least(_limit, 200));
$$;