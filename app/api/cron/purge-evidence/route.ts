import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auditWindowClosed } from "@/lib/auditWindow";

// Cron diario (Vercel Cron) que borra del storage los archivos de evidencia de
// los checks cuya ventana de auditoría ya cerró (semana + 2 días de gracia).
// Conserva la fila daily_checks y el texto (resumen/cronómetro) en el JSONB;
// solo elimina los objetos pesados del bucket "evidencias" para no llenar el
// storage. Usa el service role (solo en servidor) y exige el secreto del cron.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CheckRow = {
  id: string;
  check_date: string;
  evidence_path: string | null;
  evidence: { audio_path?: string; video_path?: string; after_path?: string; [k: string]: unknown } | null;
};

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "missing_env" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Filtro grueso: finalizados, no purgados, con varios días de antigüedad.
  // El cierre exacto (semana + gracia) se valida con auditWindowClosed.
  const coarse = new Date();
  coarse.setDate(coarse.getDate() - 3);
  const coarseStr = coarse.toISOString().slice(0, 10);

  const { data, error } = (await supabase
    .from("daily_checks")
    .select("id, check_date, evidence_path, evidence")
    .in("status", ["approved", "rejected"])
    .eq("evidence_purged", false)
    .lt("check_date", coarseStr)
    .limit(2000)) as unknown as { data: CheckRow[] | null; error: unknown };

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  const candidates = (data ?? []).filter((c) => auditWindowClosed(c.check_date));
  if (!candidates.length) {
    return NextResponse.json({ candidates: 0, filesRemoved: 0, checksUpdated: 0 });
  }

  // Reunir todas las rutas de storage a borrar.
  const paths: string[] = [];
  for (const c of candidates) {
    if (c.evidence_path) paths.push(c.evidence_path);
    if (c.evidence?.audio_path) paths.push(c.evidence.audio_path);
    if (c.evidence?.video_path) paths.push(c.evidence.video_path);
    if (c.evidence?.after_path) paths.push(c.evidence.after_path);
  }

  let filesRemoved = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    if (!chunk.length) continue;
    const { error: rmErr } = await supabase.storage.from("evidencias").remove(chunk);
    if (!rmErr) filesRemoved += chunk.length;
  }

  // Marcar como purgados y limpiar referencias de media del JSONB
  // (se conserva summary/timer_seconds: es texto y no ocupa storage).
  let checksUpdated = 0;
  const now = new Date().toISOString();
  for (const c of candidates) {
    let keptEvidence: Record<string, unknown> | null = null;
    if (c.evidence) {
      const e = { ...c.evidence };
      delete e.audio_path;
      delete e.video_path;
      delete e.after_path;
      keptEvidence = Object.keys(e).length ? e : null;
    }
    const { error: upErr } = await supabase
      .from("daily_checks")
      .update({ evidence_purged: true, purged_at: now, evidence_path: "", evidence: keptEvidence } as never)
      .eq("id", c.id);
    if (!upErr) checksUpdated++;
  }

  return NextResponse.json({ candidates: candidates.length, filesRemoved, checksUpdated });
}
