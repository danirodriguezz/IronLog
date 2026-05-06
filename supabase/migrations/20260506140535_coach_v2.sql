ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_goal TEXT
    CHECK (primary_goal IS NULL OR primary_goal IN (
      'hipertrofia','fuerza','resistencia','perder_grasa','salud_general','rendimiento'
    )),
  ADD COLUMN IF NOT EXISTS secondary_goal TEXT
    CHECK (secondary_goal IS NULL OR secondary_goal IN (
      'hipertrofia','fuerza','resistencia','perder_grasa','salud_general','rendimiento'
    )),
  ADD COLUMN IF NOT EXISTS weekly_session_target SMALLINT
    CHECK (weekly_session_target IS NULL OR weekly_session_target BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS goal_notes TEXT;

ALTER TABLE ai_insights
  ADD COLUMN IF NOT EXISTS applied_recommendations JSONB NOT NULL DEFAULT '[]'::JSONB;
