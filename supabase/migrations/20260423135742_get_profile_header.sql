-- ==============================================================================
-- get_profile_header(u) — minimal profile header for any username
-- ==============================================================================
-- A viewer cannot read a private profile they don't follow (RLS), nor count
-- another user's followers (follows_select_involved only exposes rows where
-- the viewer is follower or following). This SECURITY DEFINER function returns
-- the header fields plus follower/following counts needed to render the public
-- profile page's top section regardless of privacy.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_profile_header(u TEXT)
RETURNS TABLE (
  id              UUID,
  username        TEXT,
  full_name       TEXT,
  avatar_url      TEXT,
  is_public       BOOLEAN,
  followers_count INT,
  following_count INT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_public,
    (SELECT COUNT(*)::INT FROM follows f
       WHERE f.following_id = p.id AND f.status = 'accepted'),
    (SELECT COUNT(*)::INT FROM follows f
       WHERE f.follower_id  = p.id AND f.status = 'accepted')
  FROM profiles p
  WHERE p.username = lower(u)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION get_profile_header(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_profile_header(TEXT) TO authenticated;
