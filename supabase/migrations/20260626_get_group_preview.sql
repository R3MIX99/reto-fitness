-- RPC pública para previsualizar un grupo por código de invitación antes de crear una liga.
-- Devuelve nombre del grupo, dueño, miembros y tier del dueño.
CREATE OR REPLACE FUNCTION get_group_preview(p_invite_code text)
RETURNS TABLE (
  group_id      uuid,
  group_name    text,
  owner_name    text,
  member_count  bigint,
  owner_tier    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id                                    AS group_id,
    g.name                                  AS group_name,
    COALESCE(p.full_name, 'Sin nombre')     AS owner_name,
    COUNT(gm.user_id)::bigint               AS member_count,
    COALESCE(s.tier, 'free')                AS owner_tier
  FROM groups g
  JOIN profiles p ON p.id = g.owner_id
  LEFT JOIN group_members gm ON gm.group_id = g.id
  LEFT JOIN subscriptions s ON s.user_id = g.owner_id
  WHERE UPPER(g.invite_code) = UPPER(p_invite_code)
  GROUP BY g.id, g.name, p.full_name, s.tier;
END;
$$;

GRANT EXECUTE ON FUNCTION get_group_preview(text) TO authenticated;
