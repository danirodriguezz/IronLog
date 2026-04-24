-- ==============================================================================
-- search_users(q) — username search across all profiles
-- ==============================================================================
-- Private profiles are hidden from non-followers by RLS on `profiles`. That's
-- correct for content, but it also makes them undiscoverable by username, which
-- breaks the ability to send a follow request. This SECURITY DEFINER function
-- exposes only the minimal fields needed to render a result row and route to
-- the public profile page, regardless of privacy.
--
-- The caller must be authenticated. The current user is excluded from results.
-- ==============================================================================

CREATE OR REPLACE FUNCTION search_users(q TEXT)
RETURNS TABLE (
  id         UUID,
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
  SELECT p.id, p.username, p.full_name, p.avatar_url, p.is_public
  FROM profiles p
  WHERE length(q) >= 2
    AND p.id <> (SELECT auth.uid())
    AND p.username ILIKE '%' || q || '%'
  ORDER BY
    (p.username ILIKE q || '%') DESC,   -- prefix matches first
    length(p.username) ASC,
    p.username ASC
  LIMIT 10;
$$;

REVOKE EXECUTE ON FUNCTION search_users(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION search_users(TEXT) TO authenticated;
