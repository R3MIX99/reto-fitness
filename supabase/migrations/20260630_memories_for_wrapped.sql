-- Recuerdos para el Wrapped anual (Pro/Elite). Preservan un subconjunto pequeño
-- de evidencias para que el cron de purga NO las borre. is_memory excluye la
-- fila del purge; la tabla memories es la fuente del Wrapped (Fase 7).
-- Manual: tope 20/año (RPC save_memory). Auto: 5 de gimnasio/año (cron purge).

alter table public.daily_checks
  add column if not exists is_memory boolean not null default false;

create table if not exists public.memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  group_id    uuid references public.groups(id) on delete set null,
  check_id    uuid,
  kind        text,
  goal_title  text,
  check_date  date not null,
  year        int  not null,
  path        text not null,
  evidence    jsonb,
  source      text not null default 'manual' check (source in ('manual','auto')),
  created_at  timestamptz not null default now()
);

create index if not exists memories_user_year_idx on public.memories (user_id, year);
create unique index if not exists memories_user_check_idx on public.memories (user_id, check_id);

alter table public.memories enable row level security;
drop policy if exists "read own memories" on public.memories;
create policy "read own memories" on public.memories for select using (auth.uid() = user_id);

-- ── RPC: guardar recuerdo (manual, Pro/Elite, tope anual) ─────────────
create or replace function public.save_memory(p_check_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_check record; v_tier text; v_year int; v_count int; v_cap int := 20;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select * into v_check from daily_checks where id = p_check_id;
  if v_check is null then raise exception 'Evidencia no encontrada'; end if;
  if v_check.user_id <> v_uid then raise exception 'No es tu evidencia'; end if;
  if coalesce(v_check.evidence_purged,false) or coalesce(v_check.evidence_path,'') = '' then
    raise exception 'La evidencia ya no esta disponible'; end if;
  v_tier := effective_tier(v_uid);
  if v_tier not in ('pro','elite') then raise exception 'Funcion Pro/Elite'; end if;
  v_year := extract(year from v_check.check_date)::int;
  select count(*) into v_count from memories where user_id=v_uid and year=v_year and source='manual';
  if v_count >= v_cap then raise exception 'Llegaste al limite de % recuerdos este ano', v_cap; end if;

  insert into memories (user_id, group_id, check_id, kind, goal_title, check_date, year, path, evidence, source)
  values (v_uid, v_check.group_id, p_check_id, v_check.kind,
          (select title from goals where id = v_check.goal_id),
          v_check.check_date, v_year, v_check.evidence_path, v_check.evidence, 'manual')
  on conflict (user_id, check_id) do nothing;

  -- marcar TODAS las filas hermanas (fan-out por grupo) para que el purge las exente
  update daily_checks set is_memory = true
   where user_id = v_uid and check_date = v_check.check_date
     and kind = v_check.kind
     and coalesce(goal_id::text,'') = coalesce(v_check.goal_id::text,'');
end; $$;

-- ── RPC: quitar recuerdo ──────────────────────────────────────────────
create or replace function public.remove_memory(p_check_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_check record;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select * into v_check from daily_checks where id = p_check_id;
  delete from memories where user_id = v_uid and check_id = p_check_id;
  if v_check is not null then
    update daily_checks set is_memory = false
     where user_id = v_uid and check_date = v_check.check_date
       and kind = v_check.kind
       and coalesce(goal_id::text,'') = coalesce(v_check.goal_id::text,'');
  end if;
end; $$;

grant execute on function public.save_memory(uuid)   to authenticated;
grant execute on function public.remove_memory(uuid) to authenticated;
