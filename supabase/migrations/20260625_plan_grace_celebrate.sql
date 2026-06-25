-- ════════════════════════════════════════════════════════════════════
-- FASE 3b — Degradación de plan con gracia de 48 h + celebración de upgrade
-- Al bajar de plan, si el dueño queda con más grupos de los permitidos,
-- tiene 48 h para borrar/transferir el exceso o se eliminan los más nuevos
-- (avisando a dueño y miembros). Al subir de plan: notificación + celebración.
-- Aplicada vía Supabase MCP el 2026-06-25 (project: upyuvlqjxwgcghtuihec)
-- ════════════════════════════════════════════════════════════════════

alter table public.subscriptions
  add column if not exists over_limit_until timestamptz,
  add column if not exists celebrate text check (celebrate in ('pro','elite'));

-- Realtime para la suscripción propia (celebración + refresco de plan en vivo)
alter table public.subscriptions replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and tablename='subscriptions') then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end $$;

-- ── Compliance: marca/limpia la ventana de 48 h según el límite de grupos ──
create or replace function public.check_plan_compliance(p_user uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_super boolean; v_tier text; v_max int; v_owned int; v_current timestamptz;
begin
  select is_super_admin into v_super from profiles where id = p_user;
  v_tier := effective_tier(p_user);
  v_max  := max_groups_for_tier(v_tier);
  select count(*) into v_owned from groups where owner_id = p_user;
  select over_limit_until into v_current from subscriptions where user_id = p_user;

  if coalesce(v_super, false) or v_owned <= v_max then
    if v_current is not null then
      update subscriptions set over_limit_until = null where user_id = p_user;
    end if;
  else
    if v_current is null then
      update subscriptions set over_limit_until = now() + interval '48 hours' where user_id = p_user;
      insert into notifications (user_id, type, title, body, metadata)
        values (p_user, 'plan_over_limit', 'Tu plan cambió',
          'Tienes más grupos de los que permite tu plan ('||v_tier||'). Tienes 48 h para borrar o transferir los grupos extra, o se eliminarán los más nuevos automáticamente.',
          jsonb_build_object('url','/grupo'));
    end if;
  end if;
end; $$;

-- ── Cron: al vencer la gracia, borra el exceso (avisando antes) ───────
create or replace function public.process_plan_grace()
returns void language plpgsql security definer set search_path to 'public' as $$
declare s record; v_tier text; v_max int; v_owned int; v_excess int; g record;
begin
  for s in select user_id from subscriptions
           where over_limit_until is not null and over_limit_until < now() loop
    if exists (select 1 from profiles where id = s.user_id and is_super_admin) then
      update subscriptions set over_limit_until = null where user_id = s.user_id; continue;
    end if;
    v_tier := effective_tier(s.user_id);
    v_max  := max_groups_for_tier(v_tier);
    select count(*) into v_owned from groups where owner_id = s.user_id;
    if v_owned <= v_max then
      update subscriptions set over_limit_until = null where user_id = s.user_id; continue;
    end if;
    v_excess := v_owned - v_max;
    for g in select id, name from groups where owner_id = s.user_id
             order by created_at desc limit v_excess loop
      insert into notifications (user_id, type, title, body, metadata)
        select gm.user_id, 'group_deleted_plan', 'Grupo eliminado',
               'El grupo "'||g.name||'" se eliminó porque superaba el plan del dueño.',
               jsonb_build_object('url','/grupo')
        from group_members gm where gm.group_id = g.id;
      delete from groups where id = g.id;  -- cascade
    end loop;
    update subscriptions set over_limit_until = null where user_id = s.user_id;
  end loop;
end; $$;

select cron.unschedule('process-plan-grace')
where exists (select 1 from cron.job where jobname = 'process-plan-grace');
select cron.schedule('process-plan-grace', '20 * * * *',
  $$ select public.process_plan_grace(); $$);

-- ── set_user_tier: celebra al subir, aplica compliance al bajar ───────
create or replace function public.set_user_tier(p_user uuid, p_tier text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_super boolean; v_old text; v_new_rank int; v_old_rank int;
begin
  select is_super_admin into v_super from profiles where id = auth.uid();
  if not coalesce(v_super, false) then raise exception 'No autorizado'; end if;
  if p_tier not in ('free','pro','elite') then raise exception 'Tier inválido'; end if;

  select coalesce(tier,'free') into v_old from subscriptions where user_id = p_user;
  v_old := coalesce(v_old, 'free');

  insert into subscriptions (user_id, tier, source, granted_by, updated_at)
    values (p_user, p_tier,
            case when p_tier = 'free' then 'default' else 'admin_grant' end, auth.uid(), now())
  on conflict (user_id) do update
    set tier = excluded.tier,
        source = case when excluded.tier = 'free' then 'default' else 'admin_grant' end,
        granted_by = auth.uid(), updated_at = now();

  v_new_rank := case p_tier when 'elite' then 2 when 'pro' then 1 else 0 end;
  v_old_rank := case v_old  when 'elite' then 2 when 'pro' then 1 else 0 end;

  if v_new_rank > v_old_rank then
    update subscriptions set celebrate = p_tier where user_id = p_user;
    insert into notifications (user_id, type, title, body, metadata)
      values (p_user, 'plan_upgraded', 'Plan mejorado',
              'Ahora tienes el plan '|| initcap(p_tier) ||'. ¡Disfrútalo!',
              jsonb_build_object('url','/perfil','tier',p_tier));
  end if;

  perform check_plan_compliance(p_user);
end; $$;

create or replace function public.clear_celebration()
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update subscriptions set celebrate = null where user_id = auth.uid();
end; $$;

-- ── get_my_plan ahora incluye la ventana de gracia y la celebración ───
create or replace function public.get_my_plan()
returns json language plpgsql stable security definer set search_path to 'public' as $$
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
    'max_members', case when coalesce(v_super,false) then 9999 else max_members_for_tier(v_tier) end,
    'owned_groups', v_owned,
    'over_limit_until', v_over,
    'celebrate', v_celebrate
  );
end; $$;

-- ── delete_group + aceptar transferencia → recalcular compliance ──────
create or replace function public.delete_group(p_group_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_count int;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then raise exception 'Grupo no encontrado'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede borrar el grupo'; end if;
  select count(*) into v_count from group_members where user_id = v_uid;
  if v_count <= 1 then raise exception 'No puedes borrar tu único grupo'; end if;
  delete from groups where id = p_group_id;
  perform check_plan_compliance(v_uid);
end; $$;

create or replace function public.respond_group_transfer(p_transfer_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
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
      if v_mc > max_members_for_tier(v_tier) then
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
    perform check_plan_compliance(t.from_user);  -- el dueño anterior perdió un grupo
  else
    update group_transfers set status = 'rejected', responded_at = now() where id = p_transfer_id;
    insert into notifications (user_id, type, title, body, metadata)
      values (t.from_user, 'group_transfer_rejected', 'Transferencia rechazada',
              'Tu transferencia de grupo fue rechazada.',
              jsonb_build_object('url','/grupo','group_id',t.group_id));
  end if;
end; $$;

grant execute on function public.check_plan_compliance(uuid) to authenticated;
grant execute on function public.clear_celebration()         to authenticated;
