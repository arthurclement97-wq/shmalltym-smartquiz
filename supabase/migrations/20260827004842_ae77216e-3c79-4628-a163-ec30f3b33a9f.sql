ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS quizzes_share_token_idx ON public.quizzes (share_token);

GRANT SELECT ON public.quizzes TO anon;

DROP POLICY IF EXISTS "Anyone can view shared quizzes" ON public.quizzes;
CREATE POLICY "Anyone can view shared quizzes"
  ON public.quizzes FOR SELECT
  TO anon, authenticated
  USING (is_public = true);