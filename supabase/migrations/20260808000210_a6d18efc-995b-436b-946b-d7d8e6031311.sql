
-- Keyset-friendly ordering index (newest first)
CREATE INDEX IF NOT EXISTS questions_created_at_id_desc_idx
  ON public.questions (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS questions_subject_created_idx
  ON public.questions (subject, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS questions_chapter_created_idx
  ON public.questions (chapter, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS questions_topic_created_idx
  ON public.questions (major_topic, created_at DESC, id DESC);

-- Cheap random-access ordering key for O(1) sampling
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS rand double precision NOT NULL DEFAULT random();

CREATE INDEX IF NOT EXISTS questions_rand_idx ON public.questions (rand);
CREATE INDEX IF NOT EXISTS questions_subject_rand_idx ON public.questions (subject, rand);
CREATE INDEX IF NOT EXISTS questions_chapter_rand_idx ON public.questions (chapter, rand);

-- Keyset (cursor) pagination: constant-time deep paging
CREATE OR REPLACE FUNCTION public.search_questions_keyset(
  _subject text DEFAULT NULL,
  _chapter text DEFAULT NULL,
  _topic text DEFAULT NULL,
  _difficulty text DEFAULT NULL,
  _pyq_only boolean DEFAULT false,
  _search text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _after_created_at timestamptz DEFAULT NULL,
  _after_id uuid DEFAULT NULL
)
RETURNS SETOF public.questions
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT q.* FROM public.questions q
  WHERE (_subject IS NULL OR q.subject::text = _subject)
    AND (_chapter IS NULL OR q.chapter = _chapter)
    AND (_topic IS NULL OR q.major_topic = _topic)
    AND (_difficulty IS NULL OR q.difficulty::text = _difficulty)
    AND (NOT _pyq_only OR q.is_pyq)
    AND (
      _search IS NULL OR _search = '' OR
      q.question_text ILIKE '%' || _search || '%' OR
      q.chapter ILIKE '%' || _search || '%' OR
      q.major_topic ILIKE '%' || _search || '%'
    )
    AND (
      _after_created_at IS NULL OR _after_id IS NULL OR
      (q.created_at, q.id) < (_after_created_at, _after_id)
    )
  ORDER BY q.created_at DESC, q.id DESC
  LIMIT greatest(1, least(_limit, 200))
$$;

-- Fast approximate total (planner estimate) for unfiltered/huge banks
CREATE OR REPLACE FUNCTION public.estimate_questions()
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT greatest(0, coalesce(
    (SELECT reltuples::bigint FROM pg_class WHERE oid = 'public.questions'::regclass), 0))
$$;

-- Bounded exact count: stops counting after _cap rows and reports capped=true
CREATE OR REPLACE FUNCTION public.count_questions_capped(
  _subject text DEFAULT NULL,
  _chapter text DEFAULT NULL,
  _topic text DEFAULT NULL,
  _difficulty text DEFAULT NULL,
  _pyq_only boolean DEFAULT false,
  _search text DEFAULT NULL,
  _cap integer DEFAULT 100000
)
RETURNS TABLE(total bigint, capped boolean)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH lim AS (
    SELECT 1 FROM public.questions q
    WHERE (_subject IS NULL OR q.subject::text = _subject)
      AND (_chapter IS NULL OR q.chapter = _chapter)
      AND (_topic IS NULL OR q.major_topic = _topic)
      AND (_difficulty IS NULL OR q.difficulty::text = _difficulty)
      AND (NOT _pyq_only OR q.is_pyq)
      AND (
        _search IS NULL OR _search = '' OR
        q.question_text ILIKE '%' || _search || '%' OR
        q.chapter ILIKE '%' || _search || '%' OR
        q.major_topic ILIKE '%' || _search || '%'
      )
    LIMIT greatest(1, least(_cap, 1000000))
  )
  SELECT count(*)::bigint, count(*) >= greatest(1, least(_cap, 1000000)) FROM lim
$$;

-- Fast random sampling using the indexed rand column (no full-table sort)
CREATE OR REPLACE FUNCTION public.sample_questions_fast(
  _subject text DEFAULT NULL,
  _chapter text DEFAULT NULL,
  _topic text DEFAULT NULL,
  _difficulty text DEFAULT NULL,
  _pyq_only boolean DEFAULT false,
  _limit integer DEFAULT 20
)
RETURNS SETOF public.questions
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  n integer := greatest(1, least(_limit, 500));
  seed double precision := random();
  got integer := 0;
BEGIN
  RETURN QUERY
  WITH fwd AS (
    SELECT q.* FROM public.questions q
    WHERE q.rand >= seed
      AND (_subject IS NULL OR q.subject::text = _subject)
      AND (_chapter IS NULL OR q.chapter = _chapter)
      AND (_topic IS NULL OR q.major_topic = _topic)
      AND (_difficulty IS NULL OR q.difficulty::text = _difficulty)
      AND (NOT _pyq_only OR q.is_pyq)
    ORDER BY q.rand
    LIMIT n
  ), back AS (
    SELECT q.* FROM public.questions q
    WHERE q.rand < seed
      AND (_subject IS NULL OR q.subject::text = _subject)
      AND (_chapter IS NULL OR q.chapter = _chapter)
      AND (_topic IS NULL OR q.major_topic = _topic)
      AND (_difficulty IS NULL OR q.difficulty::text = _difficulty)
      AND (NOT _pyq_only OR q.is_pyq)
    ORDER BY q.rand DESC
    LIMIT n
  )
  SELECT * FROM (
    SELECT * FROM fwd
    UNION ALL
    SELECT * FROM back
  ) s
  ORDER BY random()
  LIMIT n;
  GET DIAGNOSTICS got = ROW_COUNT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.search_questions_keyset(text, text, text, text, boolean, text, integer, timestamptz, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.estimate_questions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_questions_capped(text, text, text, text, boolean, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sample_questions_fast(text, text, text, text, boolean, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.search_questions_keyset(text, text, text, text, boolean, text, integer, timestamptz, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estimate_questions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_questions_capped(text, text, text, text, boolean, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sample_questions_fast(text, text, text, text, boolean, integer) TO authenticated, service_role;

ANALYZE public.questions;
