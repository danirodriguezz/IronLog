-- ==============================================================================
-- Follows: add request/accept flow
-- ==============================================================================
-- Adds a `status` column to `follows` so private profiles can gate followers
-- behind an explicit accept step.
--
--   - public profile  → follow inserted with status = 'accepted'  (immediate)
--   - private profile → follow inserted with status = 'pending'   (awaits accept)
--
-- All existing RLS policies that expose data to "followers" are updated to
-- require status = 'accepted'. A pending row grants no read access.
-- ==============================================================================

BEGIN;

-- 1. ENUM + COLUMN -----------------------------------------------------------
CREATE TYPE follow_status AS ENUM ('pending', 'accepted');

-- Existing rows (if any) were all implicitly accepted under the old schema.
ALTER TABLE follows
  ADD COLUMN status follow_status NOT NULL DEFAULT 'accepted';

CREATE INDEX idx_follows_following_status ON follows(following_id, status);

-- 2. TRIGGER — set status based on target profile privacy --------------------
-- SECURITY DEFINER so it can read profiles.is_public even when the target is
-- private (RLS on profiles would otherwise hide it from the follower).
CREATE OR REPLACE FUNCTION set_follow_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_is_public BOOLEAN;
BEGIN
  SELECT is_public INTO target_is_public
  FROM profiles
  WHERE id = NEW.following_id;

  IF target_is_public IS NULL THEN
    RAISE EXCEPTION 'target profile % not found', NEW.following_id;
  END IF;

  NEW.status := CASE WHEN target_is_public THEN 'accepted'::follow_status
                     ELSE 'pending'::follow_status END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER follows_set_status
  BEFORE INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION set_follow_status();

-- 3. TRIGGER — auto-accept pending requests when profile turns public --------
CREATE OR REPLACE FUNCTION auto_accept_pending_on_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_public = true AND OLD.is_public = false THEN
    UPDATE follows
      SET status = 'accepted'
      WHERE following_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_auto_accept_follows
  AFTER UPDATE OF is_public ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_accept_pending_on_public();

-- 4. RLS — allow the target to update (accept) a pending request -------------
CREATE POLICY "follows_update_as_following"
  ON follows FOR UPDATE
  USING ((SELECT auth.uid()) = following_id)
  WITH CHECK ((SELECT auth.uid()) = following_id);

-- 5. RLS — tighten "follower"-based reads to require accepted status ---------
-- profiles
DROP POLICY IF EXISTS "profiles_select_public_or_owner_or_follower" ON profiles;
CREATE POLICY "profiles_select_public_or_owner_or_follower"
  ON profiles FOR SELECT
  USING (
    is_public
    OR id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id  = (SELECT auth.uid())
        AND following_id = profiles.id
        AND status       = 'accepted'
    )
  );

-- sessions
DROP POLICY IF EXISTS "sessions_select_own_or_following" ON sessions;
CREATE POLICY "sessions_select_own_or_following"
  ON sessions FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id  = (SELECT auth.uid())
        AND following_id = sessions.user_id
        AND status       = 'accepted'
    )
  );

-- session_exercises
DROP POLICY IF EXISTS "session_exercises_select_own_or_following" ON session_exercises;
CREATE POLICY "session_exercises_select_own_or_following"
  ON session_exercises FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id  = (SELECT auth.uid())
        AND following_id = session_exercises.user_id
        AND status       = 'accepted'
    )
  );

-- sets
DROP POLICY IF EXISTS "sets_select_own_or_following" ON sets;
CREATE POLICY "sets_select_own_or_following"
  ON sets FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id  = (SELECT auth.uid())
        AND following_id = sets.user_id
        AND status       = 'accepted'
    )
  );

COMMIT;
