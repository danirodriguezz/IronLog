-- ==============================================================================
-- Follow-requests tray + realtime notifications
-- ==============================================================================
--   1. Add `follows` to the Supabase Realtime publication so clients can
--      subscribe to INSERTs directed at them.
--   2. Helper RPC to fetch the minimal profile fields of a given user id
--      (used by the realtime toast when the actor's profile is private and
--      the recipient doesn't follow them — RLS would otherwise hide it).
--   3. Helper RPC to fetch the pending follow requests addressed to the
--      current user, joined against the follower profile (again bypassing
--      the RLS blind-spot for private followers).
-- ==============================================================================

-- 1. Realtime publication ----------------------------------------------------
-- No-op if already added (Supabase sometimes adds all tables by default;
-- wrap in DO to tolerate either state).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'follows'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE follows';
  END IF;
END
$$;

-- 2. get_profile_by_id(uid) --------------------------------------------------
CREATE OR REPLACE FUNCTION get_profile_by_id(uid UUID)
RETURNS TABLE (
  username   TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  is_public  BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.username, p.full_name, p.avatar_url, p.is_public
  FROM profiles p
  WHERE p.id = uid
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION get_profile_by_id(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_profile_by_id(UUID) TO authenticated;

-- 3. get_pending_follow_requests() -------------------------------------------
-- Returns the pending incoming requests for the calling user, joined with
-- the follower's public header fields.
CREATE OR REPLACE FUNCTION get_pending_follow_requests()
RETURNS TABLE (
  follower_id UUID,
  username    TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  is_public   BOOLEAN,
  created_at  TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT f.follower_id, p.username, p.full_name, p.avatar_url, p.is_public, f.created_at
  FROM follows f
  JOIN profiles p ON p.id = f.follower_id
  WHERE f.following_id = (SELECT auth.uid())
    AND f.status = 'pending'
  ORDER BY f.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION get_pending_follow_requests() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_pending_follow_requests() TO authenticated;

-- 4. RLS — allow the target to reject (delete) a pending request ------------
-- The existing `follows_delete_as_follower` policy only lets the follower
-- remove their own follow. For the request tray we also need the *target*
-- to be able to delete a pending row addressed to them.
CREATE POLICY "follows_delete_as_following_when_pending"
  ON follows FOR DELETE
  USING (
    (SELECT auth.uid()) = following_id
    AND status = 'pending'
  );
