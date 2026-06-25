-- ════════════════════════════════════════════════════════════════════
-- FASE 2 — Unión a media temporada
-- Permite a un miembro del grupo unirse a la temporada en curso (o
-- programada). Sus puntos contarán desde joined_at en adelante.
-- Aplicada vía Supabase MCP el 2026-06-25 (project: upyuvlqjxwgcghtuihec)
-- ════════════════════════════════════════════════════════════════════

create or replace function public.join_active_season(p_group_id uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid       uuid := auth.uid();
  v_season_id uuid;
  v_is_member boolean;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select exists(select 1 from group_members where group_id = p_group_id and user_id = v_uid)
    into v_is_member;
  if not v_is_member then raise exception 'No eres miembro del grupo'; end if;

  -- Temporada en curso o programada del grupo (la más reciente)
  select id into v_season_id from seasons
    where group_id = p_group_id and status in ('active','reviewing')
    order by season_number desc limit 1;
  if v_season_id is null then raise exception 'No hay temporada en curso'; end if;

  if exists(select 1 from season_members where season_id = v_season_id and user_id = v_uid) then
    raise exception 'Ya participas en esta temporada';
  end if;

  -- joined_at = ahora → el leaderboard cuenta sus puntos desde esta fecha
  insert into season_members (season_id, user_id, joined_at)
    values (v_season_id, v_uid, now());

  return v_season_id;
end; $$;

grant execute on function public.join_active_season(uuid) to authenticated;
