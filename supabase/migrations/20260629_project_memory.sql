-- Memoria relacional del proyecto (decisiones, fases, bugs, preferencias).
-- Solo accesible vía MCP/management connection; RLS cerrado para la app.
-- El asistente la consulta/escribe vía MCP de Supabase en lugar de gastar
-- contexto del chat recordando el estado del proyecto.

create table if not exists public.project_memory (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in
                ('decision','phase','bug','preference','reference','fact','task')),
  title       text not null,
  body        text,
  status      text check (status in
                ('open','in_progress','done','wontfix','superseded')),
  phase       text,
  tags        text[] not null default '{}',
  importance  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists project_memory_category_idx on public.project_memory (category);
create index if not exists project_memory_status_idx   on public.project_memory (status);
create index if not exists project_memory_tags_idx     on public.project_memory using gin (tags);

-- updated_at automático
create or replace function public.set_project_memory_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_project_memory_updated_at on public.project_memory;
create trigger trg_project_memory_updated_at
  before update on public.project_memory
  for each row execute function public.set_project_memory_updated_at();

-- RLS habilitado SIN políticas: bloquea anon/authenticated.
-- El MCP usa la conexión de management y no se ve afectado.
alter table public.project_memory enable row level security;
