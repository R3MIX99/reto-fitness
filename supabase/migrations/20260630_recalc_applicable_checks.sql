-- Fix: el numerador de dieta/metas en recalc_day_score debe contar SOLO los
-- checks cuya meta sigue aplicando ese día (creada, no desactivada y con la
-- frecuencia correspondiente). Antes contaba todos los checks → un check de una
-- meta borrada inflaba los puntos. Ver migración aplicada vía MCP el 2026-06-30.
-- (Cuerpo idéntico al aplicado; ver función recalc_day_score en la BD.)
create or replace function public.recalc_day_score(p_user_id uuid, p_group_id uuid, p_date date)
returns void language plpgsql security definer set search_path to 'public' as $function$
DECLARE
  v_gym_done int:=0; v_gym_pts int:=0; v_diet_done int:=0; v_diet_total int:=0;
  v_goal_done int:=0; v_goal_total int:=0; v_diet_pts int:=0; v_goal_pts int:=0;
  v_base int; v_is_complete boolean:=false;
  v_streak int:=0; v_streak_bonus int:=0; v_prev_streak int;
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
    AND g.created_at::date<=p_date
    AND (g.deactivated_at IS NULL OR g.deactivated_at::date>p_date)
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
    AND g.created_at::date<=p_date
    AND (g.deactivated_at IS NULL OR g.deactivated_at::date>p_date)
    AND ((g.config->>'frequency') IS NULL OR (g.config->>'frequency')='daily'
      OR ((g.config->>'frequency')='weekly' AND (g.config->'weekdays') @> to_jsonb(EXTRACT(DOW FROM p_date)::int))
      OR ((g.config->>'frequency')='once' AND (g.config->>'once_date')=p_date::text)
      OR ((g.config->>'frequency')='monthly' AND EXTRACT(DAY FROM p_date)::int=(g.config->>'day_of_month')::int));
  IF v_goal_total>0 THEN v_goal_pts:=LEAST(5,FLOOR((v_goal_done::float/v_goal_total)*5)); END IF;

  v_base:=v_gym_pts+v_diet_pts+v_goal_pts;
  v_is_complete:=(v_gym_done>=1)
    AND (v_diet_total=0 OR v_diet_done>=v_diet_total)
    AND (v_goal_total=0 OR v_goal_done>=v_goal_total);

  IF v_is_complete THEN
    v_streak:=1;
    SELECT streak_day INTO v_prev_streak FROM daily_scores
    WHERE user_id=p_user_id AND group_id=p_group_id AND score_date=p_date-1;
    IF FOUND AND v_prev_streak IS NOT NULL AND v_prev_streak>0 THEN v_streak:=v_prev_streak+1; END IF;
  ELSE v_streak:=0;
  END IF;
  v_streak_bonus:=CASE WHEN v_streak>=3 THEN 3 ELSE 0 END;

  INSERT INTO daily_scores(user_id,group_id,score_date,base_points,bonus_points,penalty_points,streak_day,streak_bonus)
  VALUES(p_user_id,p_group_id,p_date,v_base,0,0,v_streak,v_streak_bonus)
  ON CONFLICT(user_id,group_id,score_date) DO UPDATE SET
    base_points=EXCLUDED.base_points,
    streak_day=EXCLUDED.streak_day,
    streak_bonus=EXCLUDED.streak_bonus;
END;$function$;
