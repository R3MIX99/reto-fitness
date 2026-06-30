-- Marca de evidencia purgada del storage tras cerrar la ventana de auditoría
-- (semana Lun–Dom del check + 2 días de gracia). La fila se conserva para el
-- historial de puntos; solo se borran los archivos pesados del bucket evidencias.
-- El borrado real lo hace el cron /api/cron/purge-evidence (service role).
alter table public.daily_checks
  add column if not exists evidence_purged boolean not null default false,
  add column if not exists purged_at timestamptz;

-- Índice parcial para que el cron encuentre rápido los candidatos sin purgar.
create index if not exists daily_checks_purge_idx
  on public.daily_checks (check_date)
  where evidence_purged = false;
