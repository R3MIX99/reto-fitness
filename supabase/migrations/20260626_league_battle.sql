-- Liga battle: gestión (cancelar) + stats para battle screen
-- Añade status 'cancelled', RPCs de cancelación y estadísticas de batalla

-- 1. Permitir status 'cancelled' en group_leagues
ALTER TABLE group_leagues
  DROP CONSTRAINT IF EXISTS group_leagues_status_check;

ALTER TABLE group_leagues
  ADD CONSTRAINT group_leagues_status_check
    CHECK (status IN ('active', 'finished', 'cancelled'));

-- 2. RPC cancel_league — solo el creador puede cancelar
CREATE OR REPLACE FUNCTION cancel_league(p_league_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE group_leagues
  SET status = 'cancelled'
  WHERE id = p_league_id
    AND created_by = auth.uid()
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes permiso para cancelar esta liga o ya no está activa';
  END IF;
END;
$$;

-- 3. RPC get_league_group_daily — puntos acumulados por grupo por día (para gráfica)
CREATE OR REPLACE FUNCTION get_league_group_daily(p_league_id uuid)
RETURNS TABLE (
  group_id  uuid,
  group_name text,
  score_date date,
  day_points bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start date;
BEGIN
  SELECT start_date INTO v_start FROM group_leagues WHERE id = p_league_id;

  RETURN QUERY
  SELECT
    g.id            AS group_id,
    g.name          AS group_name,
    ds.score_date,
    COALESCE(SUM(ds.total_points), 0)::bigint AS day_points
  FROM league_participants lp
  JOIN groups g ON g.id = lp.group_id
  JOIN group_members gm ON gm.group_id = g.id
  JOIN daily_scores ds
    ON ds.user_id  = gm.user_id
    AND ds.group_id = g.id
    AND ds.score_date >= v_start
  WHERE lp.league_id = p_league_id
    AND lp.status   = 'accepted'
  GROUP BY g.id, g.name, ds.score_date
  ORDER BY ds.score_date ASC;
END;
$$;

-- 4. RPC get_league_top_players — top 3 por grupo con puntos desde start_date
CREATE OR REPLACE FUNCTION get_league_top_players(p_league_id uuid)
RETURNS TABLE (
  group_id    uuid,
  group_name  text,
  user_id     uuid,
  full_name   text,
  avatar_url  text,
  points      bigint,
  player_rank int
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start date;
BEGIN
  SELECT start_date INTO v_start FROM group_leagues WHERE id = p_league_id;

  RETURN QUERY
  WITH scored AS (
    SELECT
      gm.group_id,
      g.name                                           AS group_name,
      gm.user_id,
      p.full_name,
      p.avatar_url,
      COALESCE(SUM(ds.total_points), 0)::bigint       AS points,
      RANK() OVER (
        PARTITION BY gm.group_id
        ORDER BY COALESCE(SUM(ds.total_points), 0) DESC
      )::int                                           AS player_rank
    FROM league_participants lp
    JOIN groups g ON g.id = lp.group_id
    JOIN group_members gm ON gm.group_id = g.id
    JOIN profiles p ON p.id = gm.user_id
    LEFT JOIN daily_scores ds
      ON ds.user_id   = gm.user_id
      AND ds.group_id = gm.group_id
      AND ds.score_date >= v_start
    WHERE lp.league_id = p_league_id
      AND lp.status   = 'accepted'
    GROUP BY gm.group_id, g.name, gm.user_id, p.full_name, p.avatar_url
  )
  SELECT s.group_id, s.group_name, s.user_id, s.full_name, s.avatar_url, s.points, s.player_rank
  FROM scored s
  WHERE s.player_rank <= 3
  ORDER BY s.group_id, s.player_rank;
END;
$$;
