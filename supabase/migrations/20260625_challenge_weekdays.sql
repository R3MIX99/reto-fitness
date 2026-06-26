-- ════════════════════════════════════════════════════════════════════
-- FASE 6a (ajuste) — Retos semanales en VARIOS días (ej. lunes y viernes)
-- Cambia weekday (int) por weekdays (int[]). Aplicada vía MCP el 2026-06-25.
-- ════════════════════════════════════════════════════════════════════

alter table public.group_challenges add column if not exists weekdays int[];

-- Migrar el día único existente al arreglo
update public.group_challenges
  set weekdays = array[weekday]
  where recurrence = 'weekly' and weekday is not null and weekdays is null;

-- Reemplazar la función de creación para aceptar weekdays int[]
drop function if exists public.create_group_challenge(uuid,text,text,text,int,int,date,text,int);

create or replace function public.create_group_challenge(
  p_group_id uuid, p_title text, p_description text, p_recurrence text,
  p_weekdays int[], p_day_of_month int, p_challenge_date date, p_at_time text, p_points int
) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_super boolean; v_tier text; v_id uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then raise exception 'Grupo no encontrado'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede crear retos'; end if;
  select is_super_admin into v_super from profiles where id = v_uid;
  v_tier := effective_tier(v_uid);
  if not coalesce(v_super,false) and v_tier not in ('pro','elite') then
    raise exception 'Los retos grupales son una función Pro o Elite';
  end if;
  if p_recurrence not in ('daily','weekly','monthly','once') then raise exception 'Recurrencia inválida'; end if;
  if p_recurrence = 'weekly' and (p_weekdays is null or array_length(p_weekdays,1) is null) then
    raise exception 'Elige al menos un día de la semana';
  end if;

  insert into group_challenges (group_id, title, description, recurrence, weekdays, day_of_month, challenge_date, at_time, points, created_by)
    values (p_group_id, p_title, nullif(p_description,''), p_recurrence,
            case when p_recurrence = 'weekly' then p_weekdays else null end,
            p_day_of_month, p_challenge_date, nullif(p_at_time,''), coalesce(p_points,3), v_uid)
    returning id into v_id;
  return v_id;
end; $$;

grant execute on function public.create_group_challenge(uuid,text,text,text,int[],int,date,text,int) to authenticated;
