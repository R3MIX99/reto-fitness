-- Agrega frecuencia "weekly": la meta solo cuenta los días de la semana en
-- config.weekdays (0=domingo … 6=sábado, igual que getDay y EXTRACT(DOW)).
CREATE OR REPLACE FUNCTION recalc_day_score(p_user_id uuid, p_group_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_pts    int := 0;
  v_diet_done  int := 0;
  v_diet_total int := 0;
  v_goal_done  int := 0;
  v_goal_total int := 0;
  v_diet_pts   int := 0;
  v_goal_pts   int := 0;
  v_base       int;
BEGIN
  SELECT LEAST(COUNT(*), 1) * 3 INTO v_gym_pts
  FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'gym' AND status <> 'rejected';

  SELECT COUNT(*) INTO v_diet_total FROM goals
  WHERE user_id = p_user_id AND kind = 'diet'
    AND created_at::date <= p_date
    AND (deactivated_at IS NULL OR deactivated_at::date > p_date)
    AND (
      (config->>'frequency') IS NULL OR (config->>'frequency') = 'daily'
      OR ((config->>'frequency') = 'weekly' AND (config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((config->>'frequency') = 'once' AND (config->>'once_date') = p_date::text)
      OR ((config->>'frequency') = 'monthly' AND EXTRACT(DAY FROM p_date)::int = (config->>'day_of_month')::int)
    );

  SELECT COUNT(*) INTO v_diet_done FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'diet' AND status <> 'rejected';

  IF v_diet_total > 0 THEN
    v_diet_pts := LEAST(5, FLOOR((v_diet_done::float / v_diet_total) * 5));
  END IF;

  SELECT COUNT(*) INTO v_goal_total FROM goals
  WHERE user_id = p_user_id AND kind = 'goal'
    AND created_at::date <= p_date
    AND (deactivated_at IS NULL OR deactivated_at::date > p_date)
    AND (
      (config->>'frequency') IS NULL OR (config->>'frequency') = 'daily'
      OR ((config->>'frequency') = 'weekly' AND (config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((config->>'frequency') = 'once' AND (config->>'once_date') = p_date::text)
      OR ((config->>'frequency') = 'monthly' AND EXTRACT(DAY FROM p_date)::int = (config->>'day_of_month')::int)
    );

  SELECT COUNT(*) INTO v_goal_done FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'goal' AND status <> 'rejected';

  IF v_goal_total > 0 THEN
    v_goal_pts := LEAST(5, FLOOR((v_goal_done::float / v_goal_total) * 5));
  END IF;

  v_base := v_gym_pts + v_diet_pts + v_goal_pts;

  INSERT INTO daily_scores (user_id, group_id, score_date, base_points, bonus_points, penalty_points)
  VALUES (p_user_id, p_group_id, p_date, v_base, 0, 0)
  ON CONFLICT (user_id, group_id, score_date)
  DO UPDATE SET base_points = v_base;
END;
$$;

GRANT EXECUTE ON FUNCTION recalc_day_score(uuid, uuid, date) TO authenticated;
