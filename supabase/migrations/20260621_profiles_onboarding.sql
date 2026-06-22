-- ════════════════════════════════════════════════════════════════════
-- Onboarding/guía + género en profiles. Aplicada vía MCP el 2026-06-21.
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles
  add column if not exists gender         text default 'unspecified'
    check (gender in ('male','female','unspecified')),
  add column if not exists onboarded      boolean not null default false,
  add column if not exists tour_completed boolean not null default false;

-- Los usuarios existentes no deben ver onboarding ni guía
update public.profiles
set onboarded = true, tour_completed = true
where created_at < now();
