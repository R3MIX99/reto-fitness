-- ════════════════════════════════════════════════════════════════════
-- Temporadas — FASE 5: editar/cancelar temporada programada (no iniciada)
-- Aplicada vía Supabase MCP el 2026-06-21 (project: upyuvlqjxwgcghtuihec)
-- (cancel_season para temporadas EN CURSO ya existe desde la Fase 1)
-- ════════════════════════════════════════════════════════════════════

-- Editar una temporada que AÚN NO empieza (start_date futuro)
create or replace function public.update_scheduled_season(
  p_season_id      uuid,
  p_duration_weeks int,
  p_start_date     date,
  p_name           text default null
) returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid    uuid := auth.uid();
  v_owner  uuid;
  v_group  uuid;
  v_start  date;
  v_status text;
  v_today  date := (now() at time zone 'America/Mexico_City')::date;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select g.owner_id, s.group_id, s.start_date, s.status
    into v_owner, v_group, v_start, v_status
  from seasons s join groups g on g.id = s.group_id
  where s.id = p_season_id;

  if v_owner is null then raise exception 'Temporada no encontrada'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede editar la temporada'; end if;
  if v_status <> 'active' or v_start <= v_today then
    raise exception 'Solo se puede editar una temporada que aún no ha empezado';
  end if;
  if p_duration_weeks not in (4,8,12,16,20) then raise exception 'Duración inválida'; end if;
  if p_start_date <= v_today then raise exception 'La fecha de inicio debe ser futura'; end if;

  update seasons
  set start_date     = p_start_date,
      end_date       = p_start_date + p_duration_weeks * 7 - 1,
      duration_weeks = p_duration_weeks,
      name           = coalesce(nullif(trim(p_name), ''), name)
  where id = p_season_id;

  delete from season_members where season_id = p_season_id;
  insert into season_members (season_id, user_id)
  select p_season_id, gm.user_id from group_members gm where gm.group_id = v_group;
end;
$$;

-- Cancelar (eliminar) una temporada que AÚN NO empieza (sin notificación)
create or replace function public.delete_scheduled_season(p_season_id uuid)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid    uuid := auth.uid();
  v_owner  uuid;
  v_start  date;
  v_status text;
  v_today  date := (now() at time zone 'America/Mexico_City')::date;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select g.owner_id, s.start_date, s.status into v_owner, v_start, v_status
  from seasons s join groups g on g.id = s.group_id
  where s.id = p_season_id;

  if v_owner is null then raise exception 'Temporada no encontrada'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede cancelar la temporada'; end if;
  if v_status <> 'active' or v_start <= v_today then
    raise exception 'Solo se puede cancelar una temporada que aún no ha empezado';
  end if;

  delete from seasons where id = p_season_id; -- cascade borra season_members
end;
$$;
