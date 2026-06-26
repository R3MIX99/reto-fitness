-- ════════════════════════════════════════════════════════════════════
-- FASE 6a — Retos grupales programados (Pro/Elite)
-- Retos daily/weekly/monthly/once que aparecen solo el día que tocan.
-- Asistencia: foto grupal de recuerdo + el admin marca la lista; los
-- asistentes reciben puntos (bonus) en el leaderboard del grupo.
-- Aplicada vía Supabase MCP el 2026-06-25 (project: upyuvlqjxwgcghtuihec)
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.group_challenges (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups(id) on delete cascade,
  title         text not null,
  description   text,
  recurrence    text not null check (recurrence in ('daily','weekly','monthly','once')),
  weekday       int  check (weekday between 0 and 6),     -- weekly
  day_of_month  int  check (day_of_month between 1 and 31),-- monthly
  challenge_date date,                                     -- once
  at_time       text,                                      -- "07:00" (opcional)
  points        int  not null default 3,
  active        boolean not null default true,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists idx_challenges_group on public.group_challenges(group_id) where active;

create table if not exists public.challenge_attendance (
  challenge_id    uuid not null references public.group_challenges(id) on delete cascade,
  occurrence_date date not null,
  user_id         uuid not null references public.profiles(id),
  attended        boolean not null default true,
  primary key (challenge_id, occurrence_date, user_id)
);

create table if not exists public.challenge_memories (
  challenge_id    uuid not null references public.group_challenges(id) on delete cascade,
  occurrence_date date not null,
  photo_path      text not null,
  uploaded_by     uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  primary key (challenge_id, occurrence_date)
);

alter table public.group_challenges   enable row level security;
alter table public.challenge_attendance enable row level security;
alter table public.challenge_memories  enable row level security;

drop policy if exists "challenges read members" on public.group_challenges;
create policy "challenges read members" on public.group_challenges
  for select using (public.is_group_member(group_id));

drop policy if exists "attendance read members" on public.challenge_attendance;
create policy "attendance read members" on public.challenge_attendance
  for select using (exists (
    select 1 from public.group_challenges c
    where c.id = challenge_id and public.is_group_member(c.group_id)));

drop policy if exists "memories read members" on public.challenge_memories;
create policy "memories read members" on public.challenge_memories
  for select using (exists (
    select 1 from public.group_challenges c
    where c.id = challenge_id and public.is_group_member(c.group_id)));

-- ── Storage: bucket de recuerdos (privado, firmado) ──────────────────
insert into storage.buckets (id, name, public) values ('recuerdos','recuerdos', false)
  on conflict (id) do nothing;

drop policy if exists "recuerdos read members" on storage.objects;
create policy "recuerdos read members" on storage.objects for select
  using (bucket_id = 'recuerdos' and public.is_group_member((storage.foldername(name))[1]::uuid));

drop policy if exists "recuerdos write owner" on storage.objects;
create policy "recuerdos write owner" on storage.objects for insert
  with check (bucket_id = 'recuerdos'
    and exists (select 1 from public.groups where id = (storage.foldername(name))[1]::uuid and owner_id = auth.uid()));

drop policy if exists "recuerdos update owner" on storage.objects;
create policy "recuerdos update owner" on storage.objects for update
  using (bucket_id = 'recuerdos'
    and exists (select 1 from public.groups where id = (storage.foldername(name))[1]::uuid and owner_id = auth.uid()));

-- ── Crear reto (solo dueño Pro/Elite o super-admin) ───────────────────
create or replace function public.create_group_challenge(
  p_group_id uuid, p_title text, p_description text, p_recurrence text,
  p_weekday int, p_day_of_month int, p_challenge_date date, p_at_time text, p_points int
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

  insert into group_challenges (group_id, title, description, recurrence, weekday, day_of_month, challenge_date, at_time, points, created_by)
    values (p_group_id, p_title, nullif(p_description,''), p_recurrence,
            p_weekday, p_day_of_month, p_challenge_date, nullif(p_at_time,''), coalesce(p_points,3), v_uid)
    returning id into v_id;
  return v_id;
end; $$;

create or replace function public.delete_group_challenge(p_challenge_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  select g.owner_id into v_owner from group_challenges c join groups g on g.id = c.group_id where c.id = p_challenge_id;
  if v_owner is null then raise exception 'Reto no encontrado'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede borrar retos'; end if;
  delete from group_challenges where id = p_challenge_id;
end; $$;

-- ── Recalcular el bonus de retos de un usuario en una fecha/grupo ─────
create or replace function public.recompute_challenge_bonus(p_user uuid, p_group uuid, p_date date)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_bonus int;
begin
  select coalesce(sum(c.points),0) into v_bonus
  from challenge_attendance ca join group_challenges c on c.id = ca.challenge_id
  where ca.user_id = p_user and ca.occurrence_date = p_date and ca.attended and c.group_id = p_group;

  perform recalc_day_score(p_user, p_group, p_date);
  update daily_scores
    set bonus_points = v_bonus,
        total_points = base_points + v_bonus - penalty_points
    where user_id = p_user and group_id = p_group and score_date = p_date;
end; $$;

-- ── Tomar asistencia (solo dueño) → puntos a los asistentes ──────────
create or replace function public.set_challenge_attendance(p_challenge_id uuid, p_date date, p_user_ids uuid[])
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_group uuid; v_owner uuid; v_affected uuid[]; u uuid;
begin
  select c.group_id, g.owner_id into v_group, v_owner
  from group_challenges c join groups g on g.id = c.group_id where c.id = p_challenge_id;
  if v_group is null then raise exception 'Reto no encontrado'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede tomar asistencia'; end if;

  -- afectados = previos ∪ nuevos
  select coalesce(array_agg(user_id), '{}') into v_affected
    from challenge_attendance where challenge_id = p_challenge_id and occurrence_date = p_date;
  v_affected := array(select distinct unnest(v_affected || coalesce(p_user_ids,'{}')));

  delete from challenge_attendance where challenge_id = p_challenge_id and occurrence_date = p_date;
  if array_length(p_user_ids,1) is not null then
    insert into challenge_attendance (challenge_id, occurrence_date, user_id, attended)
      select p_challenge_id, p_date, x, true from unnest(p_user_ids) x;
  end if;

  foreach u in array v_affected loop
    perform recompute_challenge_bonus(u, v_group, p_date);
  end loop;
end; $$;

create or replace function public.set_challenge_memory(p_challenge_id uuid, p_date date, p_path text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
  select g.owner_id into v_owner from group_challenges c join groups g on g.id = c.group_id where c.id = p_challenge_id;
  if v_owner is null then raise exception 'Reto no encontrado'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede subir el recuerdo'; end if;
  insert into challenge_memories (challenge_id, occurrence_date, photo_path, uploaded_by)
    values (p_challenge_id, p_date, p_path, v_uid)
  on conflict (challenge_id, occurrence_date)
    do update set photo_path = excluded.photo_path, uploaded_by = v_uid, created_at = now();
end; $$;

grant execute on function public.create_group_challenge(uuid,text,text,text,int,int,date,text,int) to authenticated;
grant execute on function public.delete_group_challenge(uuid)              to authenticated;
grant execute on function public.set_challenge_attendance(uuid,date,uuid[]) to authenticated;
grant execute on function public.set_challenge_memory(uuid,date,text)       to authenticated;
grant execute on function public.recompute_challenge_bonus(uuid,uuid,date)  to authenticated;
