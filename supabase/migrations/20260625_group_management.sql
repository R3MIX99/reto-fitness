-- ════════════════════════════════════════════════════════════════════
-- FASE 1 — Gestión segura de grupos: salir / borrar / transferir
-- Aplicada vía Supabase MCP el 2026-06-25 (project: upyuvlqjxwgcghtuihec)
-- ════════════════════════════════════════════════════════════════════

-- ── Tabla de transferencias de propiedad ─────────────────────────────
create table if not exists public.group_transfers (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups(id)   on delete cascade,
  from_user    uuid not null references public.profiles(id) on delete cascade,
  to_user      uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','accepted','rejected','expired')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '48 hours'),
  responded_at timestamptz
);

create index if not exists idx_group_transfers_to_pending
  on public.group_transfers(to_user) where status = 'pending';
create unique index if not exists uniq_pending_transfer_per_group
  on public.group_transfers(group_id) where status = 'pending';

alter table public.group_transfers enable row level security;

drop policy if exists "transfer parties read" on public.group_transfers;
create policy "transfer parties read" on public.group_transfers
  for select using (auth.uid() = from_user or auth.uid() = to_user);

-- ── RPC: salir de un grupo (no el dueño, no el último grupo) ──────────
create or replace function public.leave_group(p_group_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_count int;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then raise exception 'Grupo no encontrado'; end if;
  if v_owner = v_uid then
    raise exception 'El dueño no puede salir; transfiere o borra el grupo';
  end if;
  select count(*) into v_count from group_members where user_id = v_uid;
  if v_count <= 1 then raise exception 'No puedes dejar tu único grupo'; end if;
  delete from daily_scores  where group_id = p_group_id and user_id = v_uid;
  delete from group_members where group_id = p_group_id and user_id = v_uid;
end; $$;

-- ── RPC: borrar un grupo (solo dueño, no el último grupo) ─────────────
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
  delete from groups where id = p_group_id;  -- cascade borra todo lo del grupo
end; $$;

-- ── RPC: solicitar transferencia (solo dueño → miembro) ───────────────
create or replace function public.request_group_transfer(p_group_id uuid, p_to_user uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_name text; v_id uuid; v_is_member boolean;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select owner_id, name into v_owner, v_name from groups where id = p_group_id;
  if v_owner is null then raise exception 'Grupo no encontrado'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede transferir el grupo'; end if;
  if p_to_user = v_uid then raise exception 'No puedes transferirte el grupo a ti mismo'; end if;
  select exists(select 1 from group_members where group_id = p_group_id and user_id = p_to_user)
    into v_is_member;
  if not v_is_member then raise exception 'El destinatario debe ser miembro del grupo'; end if;

  -- Caduca cualquier solicitud pendiente previa de este grupo
  update group_transfers set status = 'expired', responded_at = now()
    where group_id = p_group_id and status = 'pending';

  insert into group_transfers (group_id, from_user, to_user)
    values (p_group_id, v_uid, p_to_user) returning id into v_id;

  insert into notifications (user_id, type, title, body, metadata)
    values (p_to_user, 'group_transfer', 'Transferencia de grupo',
            v_name || ' quiere transferirte la propiedad del grupo. Tienes 48 h para responder.',
            jsonb_build_object('url','/grupo','transfer_id',v_id,'group_id',p_group_id));
  return v_id;
end; $$;

-- ── RPC: responder transferencia (solo destinatario) ──────────────────
-- NOTA Fase 3: al aceptar habrá que validar que el receptor tenga el plan
-- adecuado para los miembros/funciones del grupo antes de cambiar owner_id.
create or replace function public.respond_group_transfer(p_transfer_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); t record;
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

grant execute on function public.leave_group(uuid)                     to authenticated;
grant execute on function public.delete_group(uuid)                    to authenticated;
grant execute on function public.request_group_transfer(uuid, uuid)    to authenticated;
grant execute on function public.respond_group_transfer(uuid, boolean) to authenticated;

-- ── pg_cron: caducar transferencias vencidas (limpieza diaria) ────────
select cron.unschedule('expire-group-transfers')
where exists (select 1 from cron.job where jobname = 'expire-group-transfers');

select cron.schedule(
  'expire-group-transfers',
  '10 * * * *',  -- cada hora
  $$ update public.group_transfers set status = 'expired', responded_at = now()
     where status = 'pending' and now() > expires_at; $$
);
