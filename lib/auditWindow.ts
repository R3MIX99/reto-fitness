// Ventana de auditoría de un check: su semana (lunes–domingo) + un margen de
// gracia. Mientras está abierta, el revisor puede cambiar su decisión. Una vez
// cerrada, la decisión queda bloqueada y la evidencia se purga del storage.
// Es la fuente única de verdad: la usa el frontend (mis-auditorías) y el cron
// de borrado (/api/cron/purge-evidence).

export const AUDIT_GRACE_DAYS = 2;

export function auditWindowClosed(checkDate: string, now: Date = new Date()): boolean {
  const d = new Date(checkDate + "T12:00:00");
  const day = d.getDay(); // 0=domingo … 6=sábado
  // Lunes de la semana del check
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  // Cierre = domingo (lunes + 6) + días de gracia, al final del día
  const close = new Date(monday);
  close.setDate(monday.getDate() + 6 + AUDIT_GRACE_DAYS);
  close.setHours(23, 59, 59, 999);
  return now > close;
}
