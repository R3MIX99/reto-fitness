-- Liga entre grupos (Fase 6c — Elite)
-- Tablas: group_leagues, league_participants, league_standings_snapshot
-- RPCs:   get_league_standings(league_id), respond_league_invite(league_id, group_id, accept)

CREATE TABLE group_leagues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  owner_group_id uuid NOT NULL REFERENCES groups(id),
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'finished')),
  start_date    date NOT NULL,
  end_date      date,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE league_participants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id   uuid NOT NULL REFERENCES group_leagues(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES groups(id),
  invited_by  uuid NOT NULL REFERENCES profiles(id),
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
  joined_at   timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(league_id, group_id)
);

CREATE TABLE league_standings_snapshot (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       uuid NOT NULL REFERENCES group_leagues(id) ON DELETE CASCADE,
  group_id        uuid NOT NULL REFERENCES groups(id),
  group_name      text NOT NULL,
  total_points    bigint NOT NULL DEFAULT 0,
  rank            int,
  snapshotted_at  timestamptz DEFAULT now()
);

ALTER TABLE group_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_standings_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_select" ON group_leagues FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM league_participants lp
    JOIN group_members gm ON gm.group_id = lp.group_id
    WHERE lp.league_id = group_leagues.id AND gm.user_id = auth.uid() AND lp.status IN ('pending','accepted')
  )
  OR owner_group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
CREATE POLICY "league_insert" ON group_leagues FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "league_update" ON group_leagues FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "lp_select" ON league_participants FOR SELECT TO authenticated USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  OR league_id IN (SELECT id FROM group_leagues WHERE created_by = auth.uid())
);
CREATE POLICY "lp_insert" ON league_participants FOR INSERT TO authenticated WITH CHECK (invited_by = auth.uid());
CREATE POLICY "lp_update" ON league_participants FOR UPDATE TO authenticated USING (
  group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  OR league_id IN (SELECT id FROM group_leagues WHERE created_by = auth.uid())
);

CREATE POLICY "snapshot_select" ON league_standings_snapshot FOR SELECT TO authenticated USING (
  league_id IN (
    SELECT lp.league_id FROM league_participants lp
    JOIN group_members gm ON gm.group_id = lp.group_id
    WHERE gm.user_id = auth.uid() AND lp.status = 'accepted'
  )
);

CREATE OR REPLACE FUNCTION get_league_standings(p_league_id uuid)
RETURNS TABLE (group_id uuid, group_name text, total_points bigint, member_count bigint, rank int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start date; v_end date;
BEGIN
  SELECT start_date, end_date INTO v_start, v_end FROM group_leagues WHERE id = p_league_id;
  RETURN QUERY
  WITH pts AS (
    SELECT lp.group_id, g.name AS group_name,
      COALESCE(SUM(ds.total_points), 0)::bigint AS total_points,
      COUNT(DISTINCT gm.user_id)::bigint AS member_count
    FROM league_participants lp
    JOIN groups g ON g.id = lp.group_id
    LEFT JOIN group_members gm ON gm.group_id = lp.group_id
    LEFT JOIN daily_scores ds ON ds.user_id = gm.user_id AND ds.group_id = lp.group_id
      AND ds.score_date >= v_start AND (v_end IS NULL OR ds.score_date <= v_end)
    WHERE lp.league_id = p_league_id AND lp.status = 'accepted'
    GROUP BY lp.group_id, g.name
  )
  SELECT pts.group_id, pts.group_name, pts.total_points, pts.member_count,
    RANK() OVER (ORDER BY pts.total_points DESC)::int AS rank
  FROM pts ORDER BY pts.total_points DESC;
END; $$;

GRANT EXECUTE ON FUNCTION get_league_standings(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION respond_league_invite(p_league_id uuid, p_group_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'No eres el dueño de este grupo';
  END IF;
  IF p_accept THEN
    UPDATE league_participants SET status = 'accepted', joined_at = now()
    WHERE league_id = p_league_id AND group_id = p_group_id AND status = 'pending';
  ELSE
    UPDATE league_participants SET status = 'rejected'
    WHERE league_id = p_league_id AND group_id = p_group_id AND status = 'pending';
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION respond_league_invite(uuid, uuid, boolean) TO authenticated;
