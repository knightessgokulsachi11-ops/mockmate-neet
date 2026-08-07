CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS questions_subject_idx ON public.questions (subject);
CREATE INDEX IF NOT EXISTS questions_subject_chapter_idx ON public.questions (subject, chapter);
CREATE INDEX IF NOT EXISTS questions_subject_chapter_topic_idx ON public.questions (subject, chapter, major_topic);
CREATE INDEX IF NOT EXISTS questions_difficulty_idx ON public.questions (difficulty);
CREATE INDEX IF NOT EXISTS questions_is_pyq_idx ON public.questions (is_pyq) WHERE is_pyq;
CREATE INDEX IF NOT EXISTS questions_created_at_idx ON public.questions (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS questions_text_trgm_idx ON public.questions USING gin (question_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS questions_chapter_trgm_idx ON public.questions USING gin (chapter gin_trgm_ops);
CREATE INDEX IF NOT EXISTS questions_topic_trgm_idx ON public.questions USING gin (major_topic gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.list_chapters(_subject text DEFAULT NULL)
RETURNS TABLE (chapter text, question_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT q.chapter, count(*)::bigint
  FROM public.questions q
  WHERE (_subject IS NULL OR q.subject::text = _subject)
  GROUP BY q.chapter
  ORDER BY q.chapter
$$;

CREATE OR REPLACE FUNCTION public.list_topics(_subject text DEFAULT NULL, _chapter text DEFAULT NULL)
RETURNS TABLE (major_topic text, question_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT q.major_topic, count(*)::bigint
  FROM public.questions q
  WHERE (_subject IS NULL OR q.subject::text = _subject)
    AND (_chapter IS NULL OR q.chapter = _chapter)
    AND q.major_topic <> ''
  GROUP BY q.major_topic
  ORDER BY q.major_topic
$$;

CREATE OR REPLACE FUNCTION public.count_questions(
  _subject text DEFAULT NULL,
  _chapter text DEFAULT NULL,
  _topic text DEFAULT NULL,
  _difficulty text DEFAULT NULL,
  _pyq_only boolean DEFAULT false,
  _search text DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT count(*)::bigint FROM public.questions q
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
$$;

CREATE OR REPLACE FUNCTION public.search_questions(
  _subject text DEFAULT NULL,
  _chapter text DEFAULT NULL,
  _topic text DEFAULT NULL,
  _difficulty text DEFAULT NULL,
  _pyq_only boolean DEFAULT false,
  _search text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS SETOF public.questions
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
  ORDER BY q.created_at DESC, q.id DESC
  LIMIT greatest(1, least(_limit, 200)) OFFSET greatest(0, _offset)
$$;

CREATE OR REPLACE FUNCTION public.sample_questions(
  _subject text DEFAULT NULL,
  _chapter text DEFAULT NULL,
  _topic text DEFAULT NULL,
  _difficulty text DEFAULT NULL,
  _pyq_only boolean DEFAULT false,
  _limit integer DEFAULT 20
)
RETURNS SETOF public.questions
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT q.* FROM public.questions q
  WHERE (_subject IS NULL OR q.subject::text = _subject)
    AND (_chapter IS NULL OR q.chapter = _chapter)
    AND (_topic IS NULL OR q.major_topic = _topic)
    AND (_difficulty IS NULL OR q.difficulty::text = _difficulty)
    AND (NOT _pyq_only OR q.is_pyq)
  ORDER BY random()
  LIMIT greatest(1, least(_limit, 500))
$$;

REVOKE EXECUTE ON FUNCTION public.list_chapters(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_topics(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_questions(text, text, text, text, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_questions(text, text, text, text, boolean, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sample_questions(text, text, text, text, boolean, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_chapters(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_topics(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_questions(text, text, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_questions(text, text, text, text, boolean, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sample_questions(text, text, text, text, boolean, integer) TO authenticated;