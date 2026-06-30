-- recalc_day_score ya no recalcula la racha; estos batch deben llamar a
-- compute_user_streak por (usuario,grupo) afectado al terminar.
-- Aplicada vía MCP el 2026-06-30 (project: upyuvlqjxwgcghtuihec).

create or replace function public.recalc_streaks_for_user(p_user_id uuid, p_group_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
DECLARE r record;
BEGIN
  FOR r IN SELECT score_date FROM daily_scores
    WHERE user_id=p_user_id AND group_id=p_group_id ORDER BY score_date ASC
  LOOP
    PERFORM recalc_day_score(p_user_id, p_group_id, r.score_date);
  END LOOP;
  PERFORM compute_user_streak(p_user_id, p_group_id);
END;$function$;

create or replace function public.recalc_my_scores(p_from date DEFAULT '2000-01-01'::date, p_to date DEFAULT CURRENT_DATE)
returns void language plpgsql security definer set search_path to 'public' as $function$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT dc.group_id, dc.check_date FROM daily_checks dc
    JOIN group_members gm ON gm.group_id=dc.group_id AND gm.user_id=auth.uid()
    WHERE dc.user_id=auth.uid() AND dc.check_date BETWEEN p_from AND p_to
    GROUP BY dc.group_id, dc.check_date
  LOOP
    PERFORM recalc_day_score(auth.uid(), r.group_id, r.check_date);
  END LOOP;
  FOR r IN
    SELECT DISTINCT dc.group_id FROM daily_checks dc
    JOIN group_members gm ON gm.group_id=dc.group_id AND gm.user_id=auth.uid()
    WHERE dc.user_id=auth.uid() AND dc.check_date BETWEEN p_from AND p_to
  LOOP
    PERFORM compute_user_streak(auth.uid(), r.group_id);
  END LOOP;
END;$function$;

create or replace function public.auto_approve_old_checks(p_group_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
DECLARE v_week_start date; v_check record; r record;
BEGIN
  v_week_start := date_trunc('week', NOW() AT TIME ZONE 'America/Mexico_City')::date;
  FOR v_check IN
    SELECT id, user_id, check_date FROM daily_checks
    WHERE group_id=p_group_id AND status='pending' AND check_date < v_week_start
  LOOP
    UPDATE daily_checks SET status='approved' WHERE id=v_check.id;
    PERFORM recalc_day_score(v_check.user_id, p_group_id, v_check.check_date);
  END LOOP;
  FOR r IN SELECT DISTINCT user_id FROM daily_checks WHERE group_id=p_group_id LOOP
    PERFORM compute_user_streak(r.user_id, p_group_id);
  END LOOP;
END;$function$;

create or replace function public.purge_goal_checks(p_goal_id uuid)
returns text[] language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid(); v_goal record; v_cut date;
  v_paths text[] := '{}'; v_affected text[]; v_item text; v_g uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select * into v_goal from goals where id = p_goal_id and user_id = v_uid;
  if v_goal is null or v_goal.deactivated_at is null then return v_paths; end if;
  v_cut := (v_goal.deactivated_at at time zone 'America/Mexico_City')::date;

  select coalesce(array_agg(p), '{}') into v_paths from (
    select dc.evidence_path as p from daily_checks dc
      where dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut and coalesce(dc.evidence_path,'')<>''
    union all
    select dc.evidence->>'audio_path' from daily_checks dc where dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut and dc.evidence->>'audio_path' is not null
    union all
    select dc.evidence->>'video_path' from daily_checks dc where dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut and dc.evidence->>'video_path' is not null
    union all
    select dc.evidence->>'after_path' from daily_checks dc where dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut and dc.evidence->>'after_path' is not null
  ) s;

  select coalesce(array_agg(distinct group_id::text||'|'||check_date::text), '{}')
    into v_affected from daily_checks where user_id=v_uid and goal_id=p_goal_id and check_date>=v_cut;

  delete from audits a using daily_checks dc
    where a.check_id=dc.id and dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut;
  delete from memories where user_id=v_uid and check_id in (
    select id from daily_checks where user_id=v_uid and goal_id=p_goal_id and check_date>=v_cut);
  delete from daily_checks where user_id=v_uid and goal_id=p_goal_id and check_date>=v_cut;

  foreach v_item in array v_affected loop
    perform recalc_day_score(v_uid, split_part(v_item,'|',1)::uuid, split_part(v_item,'|',2)::date);
  end loop;
  for v_g in select distinct split_part(a,'|',1)::uuid from unnest(v_affected) a loop
    perform compute_user_streak(v_uid, v_g);
  end loop;

  return v_paths;
end; $$;
