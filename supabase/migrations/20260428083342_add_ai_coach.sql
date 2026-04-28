ALTER TABLE profiles
  ADD COLUMN experience_level TEXT
    CHECK (experience_level IS NULL OR experience_level IN ('beginner', 'intermediate', 'advanced'));

CREATE TABLE ai_insights (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own insights"
  ON ai_insights FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own insights"
  ON ai_insights FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
