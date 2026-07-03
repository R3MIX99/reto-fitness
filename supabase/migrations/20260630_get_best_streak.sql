-- Mejor racha histórica (para el perfil): días CONSECUTIVOS con día completo
-- (gym + toda la dieta + todas las metas aplicables), no solo días con alguna
-- evidencia. Misma lógica que get_wrapped, sin acotar a un año.
-- Aplicada vía MCP el 2026-06-30 (project: upyuvlqjxwgcghtuihec).
create or replace function public.get_best_streak()
returns int language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_res int;
begin
  if v_uid is null then return 0; end if;

  with active as (
    select distinct check_date from daily_checks
    where user_id = v_uid and status <> 'rejected'
  ),
  my_groups as (
    select group_id from group_members where user_id = v_uid
  ),
  complete_days as (
    select a.check_date
    from active a
    where exists (
      select 1 from my_groups mg
      where is_day_streak_valid(v_uid, mg.group_id, a.check_date)
    )
  ),
  islands as (
    select check_date,
           check_date - (row_number() over (order by check_date))::int as grp
    from complete_days
  ),
  runs as (
    select count(*) as len from islands group by grp
  )
  select coalesce(max(len), 0) into v_res from runs;

  return v_res;
end; $function$;

grant execute on function public.get_best_streak() to authenticated;
