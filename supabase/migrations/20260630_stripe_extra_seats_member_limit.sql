-- Límite de miembros = incluidos por tier + miembros extra comprados (Stripe),
-- topado al máximo del tier. Antes solo se usaba el máximo fijo, así que el
-- add-on de asientos no tenía efecto real. Aplicada vía MCP el 2026-06-30.

create or replace function public.included_members_for_tier(p_tier text)
returns int language sql immutable as $$
  select case p_tier when 'elite' then 30 when 'pro' then 10 else 5 end;
$$;

create or replace function public.effective_member_limit(p_owner uuid)
returns int language sql stable security definer set search_path to 'public' as $$
  select least(
    included_members_for_tier(effective_tier(p_owner))
      + coalesce((select extra_seats from subscriptions where user_id = p_owner), 0),
    max_members_for_tier(effective_tier(p_owner))
  );
$$;

-- get_my_plan: max_members = incluidos + extra (o ilimitado super-admin).
create or replace function public.get_my_plan()
returns json language plpgsql stable security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid(); v_super boolean; v_tier text; v_owned int;
  v_over timestamptz; v_celebrate text;
begin
  if v_uid is null then return null; end if;
  select is_super_admin into v_super from profiles where id = v_uid;
  v_tier := effective_tier(v_uid);
  select count(*) into v_owned from groups where owner_id = v_uid;
  select over_limit_until, celebrate into v_over, v_celebrate from subscriptions where user_id = v_uid;
  return json_build_object(
    'tier', v_tier,
    'is_super_admin', coalesce(v_super, false),
    'max_groups',  case when coalesce(v_super,false) then 9999 else max_groups_for_tier(v_tier) end,
    'max_members', case when coalesce(v_super,false) then 9999 else effective_member_limit(v_uid) end,
    'owned_groups', v_owned,
    'over_limit_until', v_over,
    'celebrate', v_celebrate
  );
end; $function$;

-- join_group_by_code: usa el límite efectivo del dueño.
create or replace function public.join_group_by_code(p_invite_code text)
returns json language plpgsql security definer set search_path to 'public' as $function$
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

  for v_date in select distinct check_date from daily_checks where user_id = v_user_id loop
    perform recalc_day_score(v_user_id, v_user_id, v_date);
  end loop;

  return json_build_object('id', v_group_id, 'name', v_group_name,
                           'owner_name', coalesce(v_owner_name, 'Administrador'));
end; $function$;

-- respond_group_transfer: el receptor debe cubrir los miembros con su límite efectivo.
create or replace function public.respond_group_transfer(p_transfer_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid(); t record; v_super boolean; v_tier text; v_mc int; v_owned int;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select * into t from group_transfers where id = p_transfer_id;
  if t.id is null then raise exception 'Transferencia no encontrada'; end if;
  if t.to_user <> v_uid then raise exception 'No autorizado'; end if;
  if t.status <> 'pending' then raise exception 'Esta transferencia ya no está activa'; end if;
  if now() > t.expires_at then
    update group_transfers set status = 'expired', responded_at = now() where id = p_transfer_id;
    raise exception 'La transferencia expiró';
  end if;

  if p_accept then
    select is_super_admin into v_super from profiles where id = v_uid;
    if not coalesce(v_super, false) then
      v_tier := effective_tier(v_uid);
      select count(*) into v_mc from group_members where group_id = t.group_id;
      if v_mc > effective_member_limit(v_uid) then
        raise exception 'Tu plan (%) no cubre los % miembros de este grupo. Sube de plan para aceptar.', v_tier, v_mc;
      end if;
      select count(*) into v_owned from groups where owner_id = v_uid;
      if v_owned >= max_groups_for_tier(v_tier) then
        raise exception 'Tu plan (%) ya alcanzó su máximo de grupos. Sube de plan para aceptar.', v_tier;
      end if;
    end if;

    update groups set owner_id = v_uid where id = t.group_id;
    update group_transfers set status = 'accepted', responded_at = now() where id = p_transfer_id;
    insert into notifications (user_id, type, title, body, metadata)
      values (t.from_user, 'group_transfer_accepted', 'Transferencia aceptada',
              'Tu transferencia de grupo fue aceptada.',
              jsonb_build_object('url','/grupo','group_id',t.group_id));
    perform check_plan_compliance(t.from_user);
  else
    update group_transfers set status = 'rejected', responded_at = now() where id = p_transfer_id;
    insert into notifications (user_id, type, title, body, metadata)
      values (t.from_user, 'group_transfer_rejected', 'Transferencia rechazada',
              'Tu transferencia de grupo fue rechazada.',
              jsonb_build_object('url','/grupo','group_id',t.group_id));
  end if;
end; $function$;
