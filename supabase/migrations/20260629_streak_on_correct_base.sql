-- Agrega cálculo de streak a recalc_day_score manteniendo los filtros
-- de frecuencia correctos (daily/weekly/once/monthly).
-- Un día de racha = gimnasio hecho + 100% de las metas programadas ese día.
-- Procesar en orden cronológico para encadenar correctamente el contador.

CREATE OR REPLACE FUNCTION recalc_day_score(p_user_id uuid, p_group_id uuid, p_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_gym_done     int := 0;
  v_gym_pts      int := 0;
  v_diet_done    int := 0;
  v_diet_total   int := 0;
  v_goal_done    int := 0;
  v_goal_total   int := 0;
  v_diet_pts     int := 0;
  v_goal_pts     int := 0;
  v_base         int;
  v_is_complete  boolean := false;
  v_streak       int := 0;
  v_streak_bonus int := 0;
  v_prev_streak  int;
BEGIN
  -- ── Gimnasio ──────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_gym_done FROM daily_checks
  WHERE user_id=p_user_id AND group_id=p_group_id
    AND check_date=p_date AND kind='gym' AND status<>'rejected';
  v_gym_pts := LEAST(v_gym_done, 1) * 3;

  -- ── Dieta (filtra por frecuencia y vigencia) ───────────────────────────────
  SELECT COUNT(*) INTO v_diet_total FROM goals
  WHERE user_id=p_user_id AND kind='diet'
    AND created_at::date <= p_date
    AND (deactivated_at IS NULL OR deactivated_at::date > p_date)
    AND (
      (config->>'frequency') IS NULL OR (config->>'frequency')='daily'
      OR ((config->>'frequency')='weekly' AND (config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((config->>'frequency')='once'    AND (config->>'once_date')=p_date::text)
      OR ((config->>'frequency')='monthly' AND EXTRACT(DAY FROM p_date)::int=(config->>'day_of_month')::int)
    );

  SELECT COUNT(*) INTO v_diet_done FROM daily_checks
  WHERE user_id=p_user_id AND group_id=p_group_id
    AND check_date=p_date AND kind='diet' AND status<>'rejected';

  IF v_diet_total > 0 THEN
    v_diet_pts := LEAST(5, FLOOR((v_diet_done::float / v_diet_total) * 5));
  END IF;

  -- ── Metas diarias (filtra por frecuencia y vigencia) ──────────────────────
  SELECT COUNT(*) INTO v_goal_total FROM goals
  WHERE user_id=p_user_id AND kind='goal'
    AND created_at::date <= p_date
    AND (deactivated_at IS NULL OR deactivated_at::date > p_date)
    AND (
      (config->>'frequency') IS NULL OR (config->>'frequency')='daily'
      OR ((config->>'frequency')='weekly' AND (config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((config->>'frequency')='once'    AND (config->>'once_date')=p_date::text)
      OR ((config->>'frequency')='monthly' AND EXTRACT(DAY FROM p_date)::int=(config->>'day_of_month')::int)
    );

  SELECT COUNT(*) INTO v_goal_done FROM daily_checks
  WHERE user_id=p_user_id AND group_id=p_group_id
    AND check_date=p_date AND kind='goal' AND status<>'rejected';

  IF v_goal_total > 0 THEN
    v_goal_pts := LEAST(5, FLOOR((v_goal_done::float / v_goal_total) * 5));
  END IF;

  v_base := v_gym_pts + v_diet_pts + v_goal_pts;

  -- ── Racha: día completo = gym + 100% dieta programada + 100% metas programadas
  v_is_complete := (v_gym_done >= 1)
    AND (v_diet_total = 0 OR v_diet_done >= v_diet_total)
    AND (v_goal_total = 0 OR v_goal_done >= v_goal_total);

  IF v_is_complete THEN
    v_streak := 1;
    SELECT streak_day INTO v_prev_streak FROM daily_scores
    WHERE user_id=p_user_id AND group_id=p_group_id AND score_date = p_date - 1;
    IF FOUND AND v_prev_streak IS NOT NULL AND v_prev_streak > 0 THEN
      v_streak := v_prev_streak + 1;
    END IF;
  ELSE
    v_streak := 0;
  END IF;

  v_streak_bonus := CASE WHEN v_streak >= 3 THEN 3 ELSE 0 END;

  -- total_points es columna GENERADA: no escribirla.
  -- bonus_points y penalty_points se preservan en el UPDATE.
  INSERT INTO daily_scores
    (user_id, group_id, score_date, base_points, bonus_points, penalty_points, streak_day, streak_bonus)
  VALUES
    (p_user_id, p_group_id, p_date, v_base, 0, 0, v_streak, v_streak_bonus)
  ON CONFLICT (user_id, group_id, score_date)
  DO UPDATE SET
    base_points  = EXCLUDED.base_points,
    streak_day   = EXCLUDED.streak_day,
    streak_bonus = EXCLUDED.streak_bonus;
END;
$$;

GRANT EXECUTE ON FUNCTION recalc_day_score(uuid, uuid, date) TO authenticated;

-- Recalcula todos los días de un usuario/grupo en orden cronológico
-- para que el streak se encadene correctamente.
CREATE OR REPLACE FUNCTION recalc_streaks_for_user(p_user_id uuid, p_group_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT check_date FROM daily_checks
    WHERE user_id = p_user_id AND group_id = p_group_id
    ORDER BY check_date ASC
  LOOP
    PERFORM recalc_day_score(p_user_id, p_group_id, r.check_date);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION recalc_streaks_for_user(uuid, uuid) TO authenticated;
