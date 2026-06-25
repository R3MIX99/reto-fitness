-- ════════════════════════════════════════════════════════════════════
-- FASE 1/2 (realtime) — Cambios de grupos/membresías/transferencias en vivo
-- Sin esto, al transferir un grupo el dueño anterior seguía viéndose como
-- dueño hasta recargar. Aplicada vía Supabase MCP el 2026-06-25.
-- ════════════════════════════════════════════════════════════════════

-- REPLICA IDENTITY FULL: necesario para que los eventos DELETE/UPDATE lleven
-- la fila completa y se evalúe RLS correctamente en realtime.
alter table public.group_members   replica identity full;
alter table public.group_transfers replica identity full;

-- Añadir a la publicación de realtime (idempotente)
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'groups') then
    alter publication supabase_realtime add table public.groups;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'group_members') then
    alter publication supabase_realtime add table public.group_members;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'group_transfers') then
    alter publication supabase_realtime add table public.group_transfers;
  end if;
end $$;
