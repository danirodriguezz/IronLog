-- ==============================================================================
-- IronLog — routines.day_of_week
-- ==============================================================================
-- Adds optional weekly-slot assignment to routines.
--   - day_of_week uses ISO 8601: 1 = Monday … 7 = Sunday.
--   - NULL means "unassigned" (lives in the baúl on the UI).
--   - Partial unique index enforces at most one routine per (user, day),
--     while allowing any number of unassigned routines to coexist.
-- ==============================================================================

ALTER TABLE routines
  ADD COLUMN day_of_week SMALLINT
  CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 1 AND 7));

CREATE UNIQUE INDEX routines_user_day_unique
  ON routines(user_id, day_of_week)
  WHERE day_of_week IS NOT NULL;
