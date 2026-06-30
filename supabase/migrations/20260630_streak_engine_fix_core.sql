-- ════════════════════════════════════════════════════════════════════
-- Fix del motor de rachas (2 bugs):
-- 1) compute_user_streak empezaba en HOY: si hoy no estaba completo (día en
--    curso) salía del bucle y reseteaba toda la racha a 0. Ahora empieza en
--    hoy si está completo, o en AYER si no (hoy sigue en curso, no rompe).
-- 2) compute_user_streak hacía INSERT ... total_points (columna GENERADA) →
--    fallaba cuando había racha. Se quita total_points del INSERT.
-- Además is_day_streak_valid usa la MISMA aplicabilidad que recalc
-- (creada/no desactivada/frecuencia) y recalc_day_score deja de tocar la racha
-- (compute_user_streak es la única autoridad).
-- Aplicada vía MCP el 2026-06-30 (project: upyuvlqjxwgcghtuihec).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.is_day_streak_valid(p_user_id uuid, p_group_id uuid, p_date date)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
DECLARE v_goal record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM daily_checks
    WHERE user_id=p_user_id AND group_id=p_group_id AND check_date=p_date
      AND kind='gym' AND status<>'rejected'
  ) THEN RETURN false; END IF;

  FOR v_goal IN
    SELECT g.id FROM goals g
    WHERE g.user_id=p_user_id AND g.kind IN ('diet','goal')
      AND g.created_at::date <= p_date
      AND (g.deactivated_at IS NULL OR g.deactivated_at::date > p_date)
      AND ((g.config->>'frequency') IS NULL OR (g.config->>'frequency')='daily'
        OR ((g.config->>'frequency')='weekly' AND (g.config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
        OR ((g.config->>'frequency')='once' AND (g.config->>'once_date')=p_date::text)
        OR ((g.config->>'frequency')='monthly' AND EXTRACT(DAY FROM p_date)::int=(g.config->>'day_of_month')::int))
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM daily_checks
      WHERE user_id=p_user_id AND group_id=p_group_id AND check_date=p_date
        AND goal_id=v_goal.id AND status<>'rejected'
    ) THEN RETURN false; END IF;
  END LOOP;

  RETURN true;
END;$function$;

create or replace function public.compute_user_streak(p_user_id uuid, p_group_id uuid)
returns integer language plpgsql security definer set search_path to 'public' as $function$
DECLARE
  v_day date; v_today date; v_start date; v_i int; v_total int := 0;
  v_streak_days date[] := '{}';
BEGIN
  v_today := (now() at time zone 'America/Mexico_City')::date;
  v_start := v_today;
  IF NOT is_day_streak_valid(p_user_id, p_group_id, v_today) THEN
    v_start := v_today - 1;
  END IF;

  UPDATE daily_scores SET streak_day=0, streak_bonus=0
   WHERE user_id=p_user_id AND group_id=p_group_id;

  FOR v_i IN 0..89 LOOP
    v_day := v_start - v_i;
    EXIT WHEN NOT is_day_streak_valid(p_user_id, p_group_id, v_day);
    v_total := v_total + 1;
    v_streak_days := array_append(v_streak_days, v_day);
  END LOOP;

  IF v_total > 0 THEN
    FOR v_i IN 1..v_total LOOP
      v_day := v_streak_days[v_i];
      INSERT INTO daily_scores (user_id, group_id, score_date, streak_day, streak_bonus)
      VALUES (p_user_id, p_group_id, v_day, v_total - v_i + 1,
              CASE WHEN (v_total - v_i + 1) >= 3 THEN 3 ELSE 0 END)
      ON CONFLICT (user_id, group_id, score_date) DO UPDATE
        SET streak_day = EXCLUDED.streak_day, streak_bonus = EXCLUDED.streak_bonus;
    END LOOP;
  END IF;

  RETURN v_total;
END;$function$;

create or replace function public.recalc_day_score(p_user_id uuid, p_group_id uuid, p_date date)
returns void language plpgsql security definer set search_path to 'public' as $function$
DECLARE
  v_gym_done int:=0; v_gym_pts int:=0; v_diet_done int:=0; v_diet_total int:=0;
  v_goal_done int:=0; v_goal_total int:=0; v_diet_pts int:=0; v_goal_pts int:=0; v_base int;
BEGIN
  SELECT COUNT(*) INTO v_gym_done FROM daily_checks
  WHERE user_id=p_user_id AND group_id=p_group_id AND check_date=p_date AND kind='gym' AND status<>'rejected';
  v_gym_pts:=LEAST(v_gym_done,1)*3;

  SELECT COUNT(*) INTO v_diet_total FROM goals
  WHERE user_id=p_user_id AND kind='diet' AND created_at::date<=p_date
    AND (deactivated_at IS NULL OR deactivated_at::date>p_date)
    AND ((config->>'frequency') IS NULL OR (config->>'frequency')='daily'
      OR ((config->>'frequency')='weekly' AND (config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((config->>'frequency')='once' AND (config->>'once_date')=p_date::text)
      OR ((config->>'frequency')='monthly' AND EXTRACT(DAY FROM p_date)::int=(config->>'day_of_month')::int));
  SELECT COUNT(*) INTO v_diet_done FROM daily_checks dc JOIN goals g ON g.id=dc.goal_id
  WHERE dc.user_id=p_user_id AND dc.group_id=p_group_id AND dc.check_date=p_date AND dc.kind='diet' AND dc.status<>'rejected'
    AND g.created_at::date<=p_date AND (g.deactivated_at IS NULL OR g.deactivated_at::date>p_date)
    AND ((g.config->>'frequency') IS NULL OR (g.config->>'frequency')='daily'
      OR ((g.config->>'frequency')='weekly' AND (g.config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((g.config->>'frequency')='once' AND (g.config->>'once_date')=p_date::text)
      OR ((g.config->>'frequency')='monthly' AND EXTRACT(DAY FROM p_date)::int=(g.config->>'day_of_month')::int));
  IF v_diet_total>0 THEN v_diet_pts:=LEAST(5,FLOOR((v_diet_done::float/v_diet_total)*5)); END IF;

  SELECT COUNT(*) INTO v_goal_total FROM goals
  WHERE user_id=p_user_id AND kind='goal' AND created_at::date<=p_date
    AND (deactivated_at IS NULL OR deactivated_at::date>p_date)
    AND ((config->>'frequency') IS NULL OR (config->>'frequency')='daily'
      OR ((config->>'frequency')='weekly' AND (config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((config->>'frequency')='once' AND (config->>'once_date')=p_date::text)
      OR ((config->>'frequency')='monthly' AND EXTRACT(DAY FROM p_date)::int=(config->>'day_of_month')::int));
  SELECT COUNT(*) INTO v_goal_done FROM daily_checks dc JOIN goals g ON g.id=dc.goal_id
  WHERE dc.user_id=p_user_id AND dc.group_id=p_group_id AND dc.check_date=p_date AND dc.kind='goal' AND dc.status<>'rejected'
    AND g.created_at::date<=p_date AND (g.deactivated_at IS NULL OR g.deactivated_at::date>p_date)
    AND ((g.config->>'frequency') IS NULL OR (g.config->>'frequency')='daily'
      OR ((g.config->>'frequency')='weekly' AND (g.config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((g.config->>'frequency')='once' AND (g.config->>'once_date')=p_date::text)
      OR ((g.config->>'frequency')='monthly' AND EXTRACT(DAY FROM p_date)::int=(g.config->>'day_of_month')::int));
  IF v_goal_total>0 THEN v_goal_pts:=LEAST(5,FLOOR((v_goal_done::float/v_goal_total)*5)); END IF;

  v_base:=v_gym_pts+v_diet_pts+v_goal_pts;

  INSERT INTO daily_scores(user_id,group_id,score_date,base_points,bonus_points,penalty_points)
  VALUES(p_user_id,p_group_id,p_date,v_base,0,0)
  ON CONFLICT(user_id,group_id,score_date) DO UPDATE SET base_points=EXCLUDED.base_points;
END;$function$;
