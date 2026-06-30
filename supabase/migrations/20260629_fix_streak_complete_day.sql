-- Un día de racha = día completamente cumplido:
--   gimnasio hecho + 100% de dieta + 100% de metas diarias
-- Antes contaba cualquier día con base_points > 0 (incorrecto).
-- También usa streak_day del día anterior (en lugar de base_points) para
-- encadenar rachas correctamente al procesar en orden cronológico.

CREATE OR REPLACE FUNCTION recalc_day_score(p_user_id uuid, p_group_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_check_date   date;
  v_prev_streak  int;
BEGIN
  -- ── Gimnasio ─────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_gym_done
  FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'gym' AND status <> 'rejected';

  v_gym_pts := LEAST(v_gym_done, 1) * 3;

  -- ── Dieta ─────────────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_diet_total
  FROM goals WHERE user_id = p_user_id AND kind = 'diet' AND active = true;

  SELECT COUNT(*) INTO v_diet_done
  FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'diet' AND status <> 'rejected';

  IF v_diet_total > 0 THEN
    v_diet_pts := FLOOR((v_diet_done::float / v_diet_total) * 5);
  END IF;

  -- ── Metas diarias ─────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_goal_total
  FROM goals WHERE user_id = p_user_id AND kind = 'goal' AND active = true;

  SELECT COUNT(*) INTO v_goal_done
  FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'goal' AND status <> 'rejected';

  IF v_goal_total > 0 THEN
    v_goal_pts := FLOOR((v_goal_done::float / v_goal_total) * 5);
  END IF;

  v_base := v_gym_pts + v_diet_pts + v_goal_pts;

  -- ── Día completo: gimnasio hecho + 100% dieta + 100% metas ───────────────
  v_is_complete := (v_gym_done >= 1)
    AND (v_diet_total = 0 OR v_diet_done >= v_diet_total)
    AND (v_goal_total = 0 OR v_goal_done >= v_goal_total);

  -- ── Racha: encadena días completos consecutivos ───────────────────────────
  -- Usa streak_day del día anterior (procesando en orden cronológico)
  -- para no tener que re-evaluar si ese día fue completo.
  IF v_is_complete THEN
    v_streak := 1;
    v_check_date := p_date - 1;

    SELECT streak_day INTO v_prev_streak
    FROM daily_scores
    WHERE user_id = p_user_id AND group_id = p_group_id
      AND score_date = v_check_date;

    IF FOUND AND v_prev_streak IS NOT NULL AND v_prev_streak > 0 THEN
      v_streak := v_prev_streak + 1;
    END IF;
  ELSE
    v_streak := 0;
  END IF;

  -- Bonus: +3 pts a partir del tercer día completo consecutivo
  v_streak_bonus := CASE WHEN v_streak >= 3 THEN 3 ELSE 0 END;

  -- ── Upsert (total_points es columna GENERADA, no se escribe) ─────────────
  INSERT INTO daily_scores (
    user_id, group_id, score_date,
    base_points, bonus_points, penalty_points,
    streak_day, streak_bonus
  )
  VALUES (
    p_user_id, p_group_id, p_date,
    v_base, 0, 0,
    v_streak, v_streak_bonus
  )
  ON CONFLICT (user_id, group_id, score_date)
  DO UPDATE SET
    base_points  = EXCLUDED.base_points,
    streak_day   = EXCLUDED.streak_day,
    streak_bonus = EXCLUDED.streak_bonus;
END;
$$;

GRANT EXECUTE ON FUNCTION recalc_day_score(uuid, uuid, date) TO authenticated;
