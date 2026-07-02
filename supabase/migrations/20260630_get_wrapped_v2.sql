-- v2: "mejor racha" = días consecutivos con día COMPLETO (gym + todas las
-- metas/dieta aplicables, igual que compute_user_streak), no solo días con
-- alguna evidencia. "Mes más fuerte" = mes con más evidencias subidas.
-- Aplicada vía MCP el 2026-06-30 (project: upyuvlqjxwgcghtuihec).
create or replace function public.get_wrapped(p_year int)
returns json language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_start date := make_date(p_year, 1, 1);
  v_end   date := make_date(p_year, 12, 31);
  v_res json;
begin
  if v_uid is null then return null; end if;

  with my_checks as (
    select distinct check_date, kind
    from daily_checks
    where user_id = v_uid and status <> 'rejected'
      and check_date between v_start and v_end
  ),
  active as (
    select distinct check_date from my_checks
  ),
  my_groups as (
    select group_id from group_members where user_id = v_uid
  ),
  -- Día "completo": válido (gym + metas aplicables) en AL MENOS uno de sus
  -- grupos (las evidencias se replican por fan-out, así que basta uno).
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
  ),
  per_day_pts as (
    select score_date, max(total_points) as pts
    from daily_scores
    where user_id = v_uid and score_date between v_start and v_end
    group by score_date
  ),
  best_month as (
    -- Mes con más evidencias subidas (conteo de checks, no de días activos).
    select extract(month from check_date)::int as m, count(*) as cnt
    from my_checks group by 1 order by cnt desc, m asc limit 1
  )
  select json_build_object(
    'year', p_year,
    'active_days',    (select count(*) from active),
    'total_checks',   (select count(*) from my_checks),
    'gym_checks',     (select count(*) from my_checks where kind = 'gym'),
    'diet_checks',    (select count(*) from my_checks where kind = 'diet'),
    'goal_checks',    (select count(*) from my_checks where kind = 'goal'),
    'longest_streak', (select coalesce(max(len), 0) from runs),
    'total_points',   (select coalesce(sum(pts), 0) from per_day_pts),
    'best_month',     (select m from best_month),
    'best_month_days',(select cnt from best_month),
    'titles', (
      select count(*) from season_standings ss
      join seasons s on s.id = ss.season_id
      where ss.user_id = v_uid and ss.rank = 1
        and extract(year from s.end_date) = p_year
    ),
    'groups', (select count(*) from group_members where user_id = v_uid),
    'memories', (select count(*) from memories where user_id = v_uid and year = p_year)
  ) into v_res;

  return v_res;
end; $function$;
