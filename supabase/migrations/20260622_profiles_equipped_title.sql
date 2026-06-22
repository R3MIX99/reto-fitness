-- ════════════════════════════════════════════════════════════════════
-- Tarjeta de jugador: título equipado (una temporada ganada).
-- Aplicada vía MCP el 2026-06-22.
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles
  add column if not exists equipped_season_id uuid
  references public.seasons(id) on delete set null;
