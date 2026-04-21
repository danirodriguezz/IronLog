-- ==============================================================================
-- IronLog — add session status
-- ==============================================================================
-- Sessions can be in 3 states:
--   active    → draft in progress (one per user at a time)
--   completed → finished and saved
--   discarded → user cancelled mid-workout (kept for audit, filtered from UI)
-- ==============================================================================

CREATE TYPE session_status AS ENUM ('active', 'completed', 'discarded');

ALTER TABLE sessions
  ADD COLUMN status session_status NOT NULL DEFAULT 'completed';

-- Only one active (in-progress) session per user.
CREATE UNIQUE INDEX idx_sessions_one_active_per_user
  ON sessions(user_id)
  WHERE status = 'active';

CREATE INDEX idx_sessions_user_status_started
  ON sessions(user_id, status, started_at DESC);
