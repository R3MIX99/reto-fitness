-- ════════════════════════════════════════════════════════════════════
-- FASE 6b (Parte 1) — Metas personalizables (Pro/Elite)
-- goals.config: módulos habilitados (cronómetro, resumen, …) + minutos.
-- daily_checks.evidence: evidencia rica (resumen de texto, segundos de
-- cronómetro, etc.), MANTENIENDO evidence_path para la foto (compat total).
-- El motor de puntos no cambia: un check sigue contando igual.
-- Aplicada vía Supabase MCP el 2026-06-25 (project: upyuvlqjxwgcghtuihec)
-- ════════════════════════════════════════════════════════════════════

alter table public.goals
  add column if not exists config jsonb;

alter table public.daily_checks
  add column if not exists evidence jsonb;
