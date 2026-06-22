-- ════════════════════════════════════════════════════════════════════
-- Temporadas — notificaciones in-app al crear/programar y al cancelar
-- una temporada programada. Aplicada vía MCP el 2026-06-21.
-- (cancel_season para temporadas EN CURSO ya notifica desde la Fase 1;
--  el push se entrega desde /api/seasons/notify)
-- ════════════════════════════════════════════════════════════════════

-- start_season: notifica in-app a los miembros (excepto el dueño)
create or replace function public.start_season(
  p_group_id       uuid,
  p_duration_weeks int,
  p_start_date     date,
  p_name           text default null
) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid    uuid := auth.uid();
  v_owner  uuid;
  v_num    int;
  v_id     uuid;
  v_name   text;
  v_today  date := (now() at time zone 'America/Mexico_City')::date;
  v_meses  text[] := array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then raise exception 'Grupo no encontrado'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede iniciar temporadas'; end if;
  if p_duration_weeks not in (4,8,12,16,20) then raise exception 'Duración inválida'; end if;

  if exists (select 1 from seasons
             where group_id = p_group_id and status in ('active','reviewing')) then
    raise exception 'Ya hay una temporada en curso';
  end if;

  select coalesce(max(season_number),0)+1 into v_num
  from seasons where group_id = p_group_id;

  v_name := coalesce(nullif(trim(p_name), ''), 'Temporada ' || v_num);

  insert into seasons (group_id, name, season_number, status,
                       start_date, end_date, duration_weeks, created_by)
  values (p_group_id, v_name, v_num, 'active',
          p_start_date, p_start_date + p_duration_weeks*7 - 1, p_duration_weeks, v_uid)
  returning id into v_id;

  insert into season_members (season_id, user_id)
  select v_id, gm.user_id from group_members gm where gm.group_id = p_group_id;

  insert into notifications (user_id, type, title, body, metadata)
  select gm.user_id, 'season_started', 'Nueva temporada',
         case when p_start_date > v_today
           then 'Se programó "' || v_name || '". Empieza el ' ||
                extract(day from p_start_date)::int || ' de ' ||
                v_meses[extract(month from p_start_date)::int] || '.'
           else '¡Empezó la temporada "' || v_name || '"!'
         end,
         jsonb_build_object('url','/grupo','season_id', v_id)
  from group_members gm
  where gm.group_id = p_group_id and gm.user_id <> v_uid;

  return v_id;
end;
$$;

-- delete_scheduled_season: avisa in-app a los miembros antes de borrar
create or replace function public.delete_scheduled_season(p_season_id uuid)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid    uuid := auth.uid();
  v_owner  uuid;
  v_group  uuid;
  v_name   text;
  v_start  date;
  v_status text;
  v_today  date := (now() at time zone 'America/Mexico_City')::date;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select g.owner_id, s.group_id, s.name, s.start_date, s.status
    into v_owner, v_group, v_name, v_start, v_status
  from seasons s join groups g on g.id = s.group_id
  where s.id = p_season_id;

  if v_owner is null then raise exception 'Temporada no encontrada'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede cancelar la temporada'; end if;
  if v_status <> 'active' or v_start <= v_today then
    raise exception 'Solo se puede cancelar una temporada que aún no ha empezado';
  end if;

  insert into notifications (user_id, type, title, body, metadata)
  select gm.user_id, 'season_cancelled', 'Temporada cancelada',
         'Se canceló la temporada programada "' || v_name || '".',
         jsonb_build_object('url','/grupo')
  from group_members gm
  where gm.group_id = v_group and gm.user_id <> v_uid;

  delete from seasons where id = p_season_id; -- cascade borra season_members
end;
$$;
