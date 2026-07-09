-- Fix: al unirse a un grupo, join_group_by_code pasaba v_user_id como group_id
-- a recalc_day_score, provocando una violación de la FK daily_scores_group_id_fkey
-- (insert or update on table "daily_scores" violates foreign key constraint
-- "daily_scores_group_id_fkey") que revertía toda la transacción e impedía unirse.
-- El segundo argumento debe ser v_group_id.

CREATE OR REPLACE FUNCTION public.join_group_by_code(p_invite_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_group_id uuid; v_group_name text; v_owner_id uuid; v_owner_name text;
  v_user_id uuid := auth.uid(); v_date date; v_member_count int; v_max_members int;
begin
  if v_user_id is null then raise exception 'No autenticado'; end if;

  select id, name, owner_id into v_group_id, v_group_name, v_owner_id
  from groups where lower(invite_code) = lower(trim(p_invite_code)) limit 1;
  if v_group_id is null then raise exception 'Código inválido o grupo no encontrado'; end if;

  if not (select is_super_admin from profiles where id = v_owner_id)
     and not exists (select 1 from group_members where group_id = v_group_id and user_id = v_user_id) then
    select count(*) into v_member_count from group_members where group_id = v_group_id;
    v_max_members := effective_member_limit(v_owner_id);
    if v_member_count >= v_max_members then
      raise exception 'Este grupo está lleno (máx % miembros para el plan del dueño).', v_max_members;
    end if;
  end if;

  select full_name into v_owner_name from profiles where id = v_owner_id;

  insert into group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  -- Recalcula los puntos del nuevo miembro EN ESTE GRUPO por cada fecha con
  -- registro. Antes pasaba v_user_id como group_id (bug) -> violaba la FK
  -- daily_scores_group_id_fkey e impedía unirse.
  for v_date in select distinct check_date from daily_checks where user_id = v_user_id loop
    perform recalc_day_score(v_user_id, v_group_id, v_date);
  end loop;

  return json_build_object('id', v_group_id, 'name', v_group_name,
                           'owner_name', coalesce(v_owner_name, 'Administrador'));
end; $function$;
