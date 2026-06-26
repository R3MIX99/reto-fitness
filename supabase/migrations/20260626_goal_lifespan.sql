-- Vida útil de una meta: aparece desde su creación y, si se borra, solo hasta
-- el día anterior a su desactivación. Antes el denominador de puntos contaba
-- TODAS las metas activas, inflando días pasados.
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

-- Metas ya inactivas (borradas antes de esta migración): no sabemos cuándo se
-- borraron. Para no alterar el histórico, las marcamos como desactivadas en su
-- propia fecha de creación (no cuentan en ningún día), igual que antes.
UPDATE goals SET deactivated_at = created_at
WHERE active = false AND deactivated_at IS NULL;

-- recalc_day_score: contar solo las metas vigentes ese día.
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
    AND (deactivated_at IS NULL OR deactivated_at::date > p_date);

  SELECT COUNT(*) INTO v_diet_done FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'diet' AND status <> 'rejected';

  IF v_diet_total > 0 THEN
    v_diet_pts := FLOOR((v_diet_done::float / v_diet_total) * 5);
  END IF;

  SELECT COUNT(*) INTO v_goal_total FROM goals
  WHERE user_id = p_user_id AND kind = 'goal'
    AND created_at::date <= p_date
    AND (deactivated_at IS NULL OR deactivated_at::date > p_date);

  SELECT COUNT(*) INTO v_goal_done FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'goal' AND status <> 'rejected';

  IF v_goal_total > 0 THEN
    v_goal_pts := FLOOR((v_goal_done::float / v_goal_total) * 5);
  END IF;

  v_base := v_gym_pts + v_diet_pts + v_goal_pts;

  INSERT INTO daily_scores (user_id, group_id, score_date, base_points, bonus_points, penalty_points, total_points)
  VALUES (p_user_id, p_group_id, p_date, v_base, 0, 0, v_base)
  ON CONFLICT (user_id, group_id, score_date)
  DO UPDATE SET
    base_points  = v_base,
    total_points = v_base + daily_scores.bonus_points - daily_scores.penalty_points;
END;
$$;

GRANT EXECUTE ON FUNCTION recalc_day_score(uuid, uuid, date) TO authenticated;
