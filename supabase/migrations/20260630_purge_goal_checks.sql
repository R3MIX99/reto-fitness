-- Al borrar (soft-delete) una meta, eliminar sus checks desde la fecha de baja
-- (día de borrado en adelante): se quitan de revisión/auditoría y dejan de sumar
-- puntos. Los días anteriores (cuando la meta estaba vigente) se conservan.
-- Devuelve las rutas de storage para que el cliente borre los archivos.
create or replace function public.purge_goal_checks(p_goal_id uuid)
returns text[] language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_goal record;
  v_cut date;
  v_paths text[] := '{}';
  v_affected text[];
  v_item text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select * into v_goal from goals where id = p_goal_id and user_id = v_uid;
  if v_goal is null or v_goal.deactivated_at is null then return v_paths; end if;
  v_cut := (v_goal.deactivated_at at time zone 'America/Mexico_City')::date;

  select coalesce(array_agg(p), '{}') into v_paths from (
    select dc.evidence_path as p from daily_checks dc
      where dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut
        and coalesce(dc.evidence_path,'') <> ''
    union all
    select dc.evidence->>'audio_path' from daily_checks dc
      where dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut and dc.evidence->>'audio_path' is not null
    union all
    select dc.evidence->>'video_path' from daily_checks dc
      where dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut and dc.evidence->>'video_path' is not null
    union all
    select dc.evidence->>'after_path' from daily_checks dc
      where dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut and dc.evidence->>'after_path' is not null
  ) s;

  select coalesce(array_agg(distinct group_id::text||'|'||check_date::text), '{}')
    into v_affected from daily_checks
    where user_id=v_uid and goal_id=p_goal_id and check_date>=v_cut;

  delete from audits a using daily_checks dc
    where a.check_id=dc.id and dc.user_id=v_uid and dc.goal_id=p_goal_id and dc.check_date>=v_cut;
  delete from memories where user_id=v_uid and check_id in (
    select id from daily_checks where user_id=v_uid and goal_id=p_goal_id and check_date>=v_cut);
  delete from daily_checks where user_id=v_uid and goal_id=p_goal_id and check_date>=v_cut;

  foreach v_item in array v_affected loop
    perform recalc_day_score(v_uid, split_part(v_item,'|',1)::uuid, split_part(v_item,'|',2)::date);
  end loop;

  return v_paths;
end; $$;

grant execute on function public.purge_goal_checks(uuid) to authenticated;
