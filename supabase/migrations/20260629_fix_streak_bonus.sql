-- Corrige recalc_day_score para calcular streak_day y streak_bonus correctamente.
-- Antes siempre insertaba streak_day=0, streak_bonus=0 sin mirar días anteriores.

CREATE OR REPLACE FUNCTION recalc_day_score(p_user_id uuid, p_group_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_pts      int := 0;
  v_diet_done    int := 0;
  v_diet_total   int := 0;
  v_goal_done    int := 0;
  v_goal_total   int := 0;
  v_diet_pts     int := 0;
  v_goal_pts     int := 0;
  v_base         int;
  v_streak       int := 0;
  v_streak_bonus int := 0;
  v_check_date   date;
  v_prev_base    int;
BEGIN
  -- ── Puntos base ──────────────────────────────────────────────────────────
  SELECT LEAST(COUNT(*), 1) * 3 INTO v_gym_pts
  FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'gym' AND status <> 'rejected';

  SELECT COUNT(*) INTO v_diet_total
  FROM goals
  WHERE user_id = p_user_id AND kind = 'diet' AND active = true;

  SELECT COUNT(*) INTO v_diet_done
  FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'diet' AND status <> 'rejected';

  IF v_diet_total > 0 THEN
    v_diet_pts := FLOOR((v_diet_done::float / v_diet_total) * 5);
  END IF;

  SELECT COUNT(*) INTO v_goal_total
  FROM goals
  WHERE user_id = p_user_id AND kind = 'goal' AND active = true;

  SELECT COUNT(*) INTO v_goal_done
  FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'goal' AND status <> 'rejected';

  IF v_goal_total > 0 THEN
    v_goal_pts := FLOOR((v_goal_done::float / v_goal_total) * 5);
  END IF;

  v_base := v_gym_pts + v_diet_pts + v_goal_pts;

  -- ── Racha: contar días consecutivos hacia atrás con base_points > 0 ─────
  -- Un día "cuenta" para la racha si el usuario hizo algo (base_points > 0).
  -- El bonus se activa a partir de 3 días seguidos.
  IF v_base > 0 THEN
    v_streak := 1;
    v_check_date := p_date - 1;
    LOOP
      SELECT base_points INTO v_prev_base
      FROM daily_scores
      WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND score_date = v_check_date;

      EXIT WHEN NOT FOUND OR v_prev_base IS NULL OR v_prev_base = 0;

      v_streak     := v_streak + 1;
      v_check_date := v_check_date - 1;
    END LOOP;
  END IF;

  -- Bonus de racha: +3 pts a partir del tercer día consecutivo
  v_streak_bonus := CASE WHEN v_streak >= 3 THEN 3 ELSE 0 END;

  -- ── Upsert ──────────────────────────────────────────────────────────────
  -- total_points es columna GENERADA (base_points + bonus_points + streak_bonus - penalty_points),
  -- no se escribe directamente.
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

-- ── Función para recalcular racha de TODOS los días de un usuario/grupo ──
-- Útil para arreglar datos históricos. Se procesa en orden cronológico
-- para que cada día pueda leer el streak_day del día anterior ya corregido.
CREATE OR REPLACE FUNCTION recalc_streaks_for_user(p_user_id uuid, p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT score_date
    FROM daily_scores
    WHERE user_id = p_user_id AND group_id = p_group_id
    ORDER BY score_date ASC
  LOOP
    PERFORM recalc_day_score(p_user_id, p_group_id, r.score_date);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION recalc_streaks_for_user(uuid, uuid) TO authenticated;
