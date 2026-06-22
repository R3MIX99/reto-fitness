-- ════════════════════════════════════════════════════════════════════
-- Sistema de temporadas por grupo — FASE 1 (fundación de datos)
-- Aplicada vía Supabase MCP el 2026-06-21 (project: upyuvlqjxwgcghtuihec)
-- ════════════════════════════════════════════════════════════════════

-- ── Tablas ────────────────────────────────────────────────────────────
create table if not exists public.seasons (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups(id) on delete cascade,
  name          text not null,
  season_number int  not null,
  status        text not null default 'active'
                check (status in ('active','reviewing','finished','cancelled')),
  start_date    date not null,
  end_date      date not null,
  duration_weeks int not null,
  grace_days    int  not null default 2,
  created_by    uuid not null references public.profiles(id),
  cancel_reason text,
  cancelled_at  timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz default now()
);

create index if not exists idx_seasons_group  on public.seasons(group_id);
create index if not exists idx_seasons_status on public.seasons(status);

-- Snapshot de quién compite (congelado al iniciar)
create table if not exists public.season_members (
  season_id uuid not null references public.seasons(id) on delete cascade,
  user_id   uuid not null references public.profiles(id),
  joined_at timestamptz default now(),
  primary key (season_id, user_id)
);

-- Snapshot del podio final (fuente de verdad del historial)
create table if not exists public.season_standings (
  season_id    uuid not null references public.seasons(id) on delete cascade,
  user_id      uuid not null references public.profiles(id),
  rank         int  not null,
  total_points int  not null,
  primary key (season_id, user_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────
alter table public.seasons          enable row level security;
alter table public.season_members   enable row level security;
alter table public.season_standings enable row level security;

drop policy if exists "members read seasons" on public.seasons;
create policy "members read seasons" on public.seasons
  for select using (public.is_group_member(group_id));

drop policy if exists "members read season_members" on public.season_members;
create policy "members read season_members" on public.season_members
  for select using (
    exists (select 1 from public.seasons s
            where s.id = season_id and public.is_group_member(s.group_id))
  );

drop policy if exists "members read season_standings" on public.season_standings;
create policy "members read season_standings" on public.season_standings
  for select using (
    exists (select 1 from public.seasons s
            where s.id = season_id and public.is_group_member(s.group_id))
  );

-- ── RPC: iniciar temporada (solo dueño) ──────────────────────────────
create or replace function public.start_season(
  p_group_id       uuid,
  p_duration_weeks int,
  p_start_date     date,
  p_name           text default null
) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_num   int;
  v_id    uuid;
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

  insert into seasons (group_id, name, season_number, status,
                       start_date, end_date, duration_weeks, created_by)
  values (p_group_id, coalesce(p_name, 'Temporada '||v_num), v_num, 'active',
          p_start_date, p_start_date + p_duration_weeks*7 - 1, p_duration_weeks, v_uid)
  returning id into v_id;

  insert into season_members (season_id, user_id)
  select v_id, gm.user_id from group_members gm where gm.group_id = p_group_id;

  return v_id;
end;
$$;

-- ── RPC: terminar temporada anticipadamente (solo dueño, SIN títulos) ─
create or replace function public.cancel_season(
  p_season_id uuid,
  p_reason    text
) returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_name  text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select g.owner_id, s.name into v_owner, v_name
  from seasons s join groups g on g.id = s.group_id
  where s.id = p_season_id;

  if v_owner is null then raise exception 'Temporada no encontrada'; end if;
  if v_owner <> v_uid then raise exception 'Solo el dueño puede terminar la temporada'; end if;

  update seasons
  set status = 'cancelled', cancel_reason = p_reason, cancelled_at = now()
  where id = p_season_id and status in ('active','reviewing');

  insert into notifications (user_id, type, title, body, metadata)
  select sm.user_id, 'season_cancelled', 'Temporada cancelada',
         'El dueño terminó la temporada "' || v_name ||
         '" antes de tiempo: ' || coalesce(nullif(trim(p_reason),''),'sin razón especificada'),
         jsonb_build_object('url','/grupo','season_id',p_season_id)
  from season_members sm where sm.season_id = p_season_id;
end;
$$;

-- ── Motor de temporadas (corre diario por pg_cron) ───────────────────
create or replace function public.process_seasons()
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  s record;
  c record;
  v_today      date;
  v_phase_end  date;
  v_all_done   boolean;
begin
  v_today := (now() at time zone 'America/Mexico_City')::date;

  -- Temporadas ACTIVAS: auto-aprobar pendientes con fase+gracia vencidas
  for s in select * from seasons where status = 'active' loop
    for c in
      select dc.id, dc.user_id, dc.check_date
      from daily_checks dc
      where dc.group_id = s.group_id
        and dc.status   = 'pending'
        and dc.check_date between s.start_date and s.end_date
    loop
      v_phase_end := s.start_date
                   + ((floor((c.check_date - s.start_date)::numeric / 7)::int + 1) * 7) - 1;
      if v_today > v_phase_end + s.grace_days then
        update daily_checks set status = 'approved' where id = c.id;
        perform recalc_day_score(c.user_id, s.group_id, c.check_date);
      end if;
    end loop;

    if v_today > s.end_date then
      update seasons set status = 'reviewing' where id = s.id;
    end if;
  end loop;

  -- Temporadas en REVISIÓN: cerrar cuando todo resuelto o gracia vencida
  for s in select * from seasons where status = 'reviewing' loop
    select not exists (
      select 1 from daily_checks dc
      where dc.group_id = s.group_id
        and dc.status   = 'pending'
        and dc.check_date between s.start_date and s.end_date
    ) into v_all_done;

    if v_all_done or v_today > s.end_date + s.grace_days then
      for c in
        select dc.id, dc.user_id, dc.check_date
        from daily_checks dc
        where dc.group_id = s.group_id
          and dc.status   = 'pending'
          and dc.check_date between s.start_date and s.end_date
      loop
        update daily_checks set status = 'approved' where id = c.id;
        perform recalc_day_score(c.user_id, s.group_id, c.check_date);
      end loop;

      insert into season_standings (season_id, user_id, rank, total_points)
      select s.id, t.user_id, t.rnk, t.pts
      from (
        select sm.user_id,
               coalesce(sum(ds.total_points),0) as pts,
               rank() over (order by coalesce(sum(ds.total_points),0) desc) as rnk
        from season_members sm
        left join daily_scores ds
          on ds.user_id = sm.user_id
         and ds.group_id = s.group_id
         and ds.score_date between s.start_date and s.end_date
        where sm.season_id = s.id
        group by sm.user_id
      ) t
      on conflict (season_id, user_id) do update
        set rank = excluded.rank, total_points = excluded.total_points;

      update seasons set status = 'finished', finished_at = now() where id = s.id;

      insert into notifications (user_id, type, title, body, metadata)
      select sm.user_id, 'season_finished', 'Temporada finalizada',
             'Se cerró la temporada "' || s.name || '". Revisa el podio.',
             jsonb_build_object('url','/grupo','season_id',s.id)
      from season_members sm where sm.season_id = s.id;
    end if;
  end loop;
end;
$$;

-- ── pg_cron: job diario a las 00:05 hora de México (06:05 UTC) ────────
create extension if not exists pg_cron;

select cron.unschedule('process-seasons-daily')
where exists (select 1 from cron.job where jobname = 'process-seasons-daily');

select cron.schedule(
  'process-seasons-daily',
  '5 6 * * *',
  $$ select public.process_seasons(); $$
);
