-- ════════════════════════════════════════════════════════════════════
-- FASE 3 — Infraestructura de planes (sin cobro) + super-admin
-- Aplicada vía Supabase MCP el 2026-06-25 (project: upyuvlqjxwgcghtuihec)
-- Límites: Free 1 grupo/5 miembros · Pro 5/49 · Elite 20/100.
-- Super-admin (dueño de la app): siempre Elite ilimitado + puede otorgar/
-- retirar tier a cualquier usuario gratis.
-- ════════════════════════════════════════════════════════════════════

-- ── Super-admin ───────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_super_admin boolean not null default false;
update public.profiles set is_super_admin = true
  where id = (select id from auth.users where email = 'amarinsantoscoy@gmail.com');

-- ── Suscripciones (una por usuario/dueño) ─────────────────────────────
create table if not exists public.subscriptions (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  tier               text not null default 'free' check (tier in ('free','pro','elite')),
  status             text not null default 'active' check (status in ('active','past_due','canceled')),
  source             text not null default 'default' check (source in ('default','admin_grant','stripe')),
  extra_seats        int  not null default 0,
  granted_by         uuid references public.profiles(id),
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
drop policy if exists "read own or admin subscription" on public.subscriptions;
create policy "read own or admin subscription" on public.subscriptions
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_super_admin)
  );

-- Fila por defecto para todos los perfiles existentes y futuros
insert into public.subscriptions (user_id) select id from public.profiles on conflict do nothing;

create or replace function public.handle_new_profile_subscription()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.subscriptions (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_profile_created_subscription on public.profiles;
create trigger on_profile_created_subscription after insert on public.profiles
  for each row execute function public.handle_new_profile_subscription();

-- ── Helpers de tier y límites ─────────────────────────────────────────
create or replace function public.effective_tier(p_user uuid)
returns text language sql stable security definer set search_path to 'public' as $$
  select case
    when exists (select 1 from profiles where id = p_user and is_super_admin) then 'elite'
    else coalesce((select tier from subscriptions where user_id = p_user), 'free')
  end;
$$;

create or replace function public.max_groups_for_tier(p_tier text)
returns int language sql immutable as $$
  select case p_tier when 'elite' then 20 when 'pro' then 5 else 1 end;
$$;

create or replace function public.max_members_for_tier(p_tier text)
returns int language sql immutable as $$
  select case p_tier when 'elite' then 100 when 'pro' then 49 else 5 end;
$$;

-- ── Límite de grupos al crear (super-admin: ilimitado) ────────────────
create or replace function public.enforce_group_limit()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_super boolean; v_tier text; v_max int; v_count int;
begin
  select is_super_admin into v_super from profiles where id = new.owner_id;
  if coalesce(v_super, false) then return new; end if;
  v_tier := effective_tier(new.owner_id);
  v_max  := max_groups_for_tier(v_tier);
  select count(*) into v_count from groups where owner_id = new.owner_id;
  if v_count >= v_max then
    raise exception 'Tu plan (%) permite hasta % grupo(s). Sube de plan para crear más.', v_tier, v_max;
  end if;
  return new;
end; $$;
drop trigger if exists trg_enforce_group_limit on public.groups;
create trigger trg_enforce_group_limit before insert on public.groups
  for each row execute function public.enforce_group_limit();

-- ── Unirse a grupo: límite de miembros según el plan del dueño ────────
create or replace function public.join_group_by_code(p_invite_code text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_group_id     uuid;
  v_group_name   text;
  v_owner_id     uuid;
  v_owner_name   text;
  v_user_id      uuid := auth.uid();
  v_date         date;
  v_member_count int;
  v_max_members  int;
begin
  if v_user_id is null then raise exception 'No autenticado'; end if;

  select id, name, owner_id into v_group_id, v_group_name, v_owner_id
  from groups where lower(invite_code) = lower(trim(p_invite_code)) limit 1;
  if v_group_id is null then raise exception 'Código inválido o grupo no encontrado'; end if;

  -- Límite de miembros según plan del dueño (no aplica si ya eres miembro)
  if not (select is_super_admin from profiles where id = v_owner_id)
     and not exists (select 1 from group_members where group_id = v_group_id and user_id = v_user_id) then
    select count(*) into v_member_count from group_members where group_id = v_group_id;
    v_max_members := max_members_for_tier(effective_tier(v_owner_id));
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
end; $$;

-- ── Aceptar transferencia: el receptor debe tener plan suficiente ─────
create or replace function public.respond_group_transfer(p_transfer_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid   uuid := auth.uid();
  t       record;
  v_super boolean;
  v_tier  text;
  v_mc    int;
  v_owned int;
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
  else
    update group_transfers set status = 'rejected', responded_at = now() where id = p_transfer_id;
    insert into notifications (user_id, type, title, body, metadata)
      values (t.from_user, 'group_transfer_rejected', 'Transferencia rechazada',
              'Tu transferencia de grupo fue rechazada.',
              jsonb_build_object('url','/grupo','group_id',t.group_id));
  end if;
end; $$;

-- ── Plan del usuario actual (para la UI) ──────────────────────────────
create or replace function public.get_my_plan()
returns json language plpgsql stable security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_super boolean; v_tier text; v_owned int;
begin
  if v_uid is null then return null; end if;
  select is_super_admin into v_super from profiles where id = v_uid;
  v_tier := effective_tier(v_uid);
  select count(*) into v_owned from groups where owner_id = v_uid;
  return json_build_object(
    'tier', v_tier,
    'is_super_admin', coalesce(v_super, false),
    'max_groups',  case when coalesce(v_super,false) then 9999 else max_groups_for_tier(v_tier) end,
    'max_members', case when coalesce(v_super,false) then 9999 else max_members_for_tier(v_tier) end,
    'owned_groups', v_owned
  );
end; $$;

-- ── Super-admin: buscar usuarios y fijar su tier ──────────────────────
create or replace function public.admin_search_users(p_query text)
returns json language plpgsql stable security definer set search_path to 'public' as $$
declare v_super boolean;
begin
  select is_super_admin into v_super from profiles where id = auth.uid();
  if not coalesce(v_super, false) then raise exception 'No autorizado'; end if;
  return (
    select coalesce(json_agg(row_to_json(u)), '[]'::json) from (
      select p.id, p.full_name, p.avatar_url, au.email,
             coalesce(s.tier, 'free') as tier, p.is_super_admin
      from profiles p
      join auth.users au on au.id = p.id
      left join subscriptions s on s.user_id = p.id
      where coalesce(trim(p_query), '') = ''
         or p.full_name ilike '%'||p_query||'%'
         or au.email   ilike '%'||p_query||'%'
      order by p.is_super_admin desc, p.full_name nulls last
      limit 25
    ) u
  );
end; $$;

create or replace function public.set_user_tier(p_user uuid, p_tier text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_super boolean;
begin
  select is_super_admin into v_super from profiles where id = auth.uid();
  if not coalesce(v_super, false) then raise exception 'No autorizado'; end if;
  if p_tier not in ('free','pro','elite') then raise exception 'Tier inválido'; end if;
  insert into subscriptions (user_id, tier, source, granted_by, updated_at)
    values (p_user, p_tier,
            case when p_tier = 'free' then 'default' else 'admin_grant' end, auth.uid(), now())
  on conflict (user_id) do update
    set tier = excluded.tier,
        source = case when excluded.tier = 'free' then 'default' else 'admin_grant' end,
        granted_by = auth.uid(), updated_at = now();
end; $$;

grant execute on function public.effective_tier(uuid)         to authenticated;
grant execute on function public.get_my_plan()                to authenticated;
grant execute on function public.admin_search_users(text)     to authenticated;
grant execute on function public.set_user_tier(uuid, text)    to authenticated;
