import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auditWindowClosed } from "@/lib/auditWindow";

// Cron diario (Vercel Cron) que borra del storage los archivos de evidencia de
// los checks cuya ventana de auditoría ya cerró (semana + 2 días de gracia).
// Antes de borrar, para usuarios Pro/Elite auto-preserva unas pocas fotos de
// gimnasio del año (recuerdos) para el Wrapped, si no han guardado suficientes.
// Conserva la fila daily_checks y el texto (resumen/cronómetro) en el JSONB.
// Usa el service role (solo en servidor) y exige el secreto del cron.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AUTO_TARGET = 5; // recuerdos automáticos por usuario por año (Pro/Elite)

type CheckRow = {
  id: string;
  user_id: string;
  group_id: string;
  kind: string;
  status: string;
  check_date: string;
  evidence_path: string | null;
  evidence: { audio_path?: string; video_path?: string; after_path?: string; [k: string]: unknown } | null;
  goal_id: string | null;
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

  // Filtro grueso: finalizados, no purgados, no-recuerdo, con archivo y varios
  // días de antigüedad. El cierre exacto (semana + gracia) lo valida auditWindowClosed.
  const coarse = new Date();
  coarse.setDate(coarse.getDate() - 3);
  const coarseStr = coarse.toISOString().slice(0, 10);

  const { data, error } = (await supabase
    .from("daily_checks")
    .select("id, user_id, group_id, kind, status, check_date, evidence_path, evidence, goal_id")
    .in("status", ["approved", "rejected"])
    .eq("evidence_purged", false)
    .eq("is_memory", false)
    .neq("evidence_path", "")
    .lt("check_date", coarseStr)
    .limit(2000)) as unknown as { data: CheckRow[] | null; error: unknown };

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  const candidates = (data ?? []).filter((c) => auditWindowClosed(c.check_date));
  if (!candidates.length) {
    return NextResponse.json({ candidates: 0, memoriesCreated: 0, filesRemoved: 0, checksUpdated: 0 });
  }

  // ── Auto-preservar recuerdos (Pro/Elite) ────────────────────────────────
  const userIds = Array.from(new Set(candidates.map((c) => c.user_id)));

  const { data: subs } = (await supabase
    .from("subscriptions").select("user_id, tier").in("user_id", userIds)) as unknown as {
      data: { user_id: string; tier: string }[] | null };
  const { data: admins } = (await supabase
    .from("profiles").select("id, is_super_admin").in("id", userIds)) as unknown as {
      data: { id: string; is_super_admin: boolean }[] | null };

  const tierMap = new Map((subs ?? []).map((s) => [s.user_id, s.tier]));
  const adminSet = new Set((admins ?? []).filter((a) => a.is_super_admin).map((a) => a.id));
  const effTier = (uid: string) => (adminSet.has(uid) ? "elite" : (tierMap.get(uid) ?? "free"));

  // Conteo de recuerdos existentes por usuario/año
  const { data: mems } = (await supabase
    .from("memories").select("user_id, year").in("user_id", userIds)) as unknown as {
      data: { user_id: string; year: number }[] | null };
  const memCount = new Map<string, number>();
  for (const m of mems ?? []) {
    const k = `${m.user_id}|${m.year}`;
    memCount.set(k, (memCount.get(k) ?? 0) + 1);
  }

  const preserved = new Set<string>(); // rutas a conservar (recuerdos)
  type MemInsert = {
    user_id: string; group_id: string; check_id: string; kind: string;
    goal_title: string | null; check_date: string; year: number; path: string;
    evidence: CheckRow["evidence"]; source: string;
  };
  const autoInserts: MemInsert[] = [];

  for (const c of candidates) {
    if (c.kind !== "gym" || c.status !== "approved" || !c.evidence_path) continue;
    const tier = effTier(c.user_id);
    if (tier !== "pro" && tier !== "elite") continue;
    const year = Number(c.check_date.slice(0, 4));
    const k = `${c.user_id}|${year}`;
    if ((memCount.get(k) ?? 0) >= AUTO_TARGET) continue;
    if (preserved.has(c.evidence_path)) continue;
    memCount.set(k, (memCount.get(k) ?? 0) + 1);
    preserved.add(c.evidence_path);
    autoInserts.push({
      user_id: c.user_id, group_id: c.group_id, check_id: c.id, kind: c.kind,
      goal_title: null, check_date: c.check_date, year, path: c.evidence_path,
      evidence: c.evidence, source: "auto",
    });
  }

  if (autoInserts.length) {
    await supabase.from("memories").upsert(autoInserts as never, { onConflict: "user_id,check_id", ignoreDuplicates: true });
    for (const m of autoInserts) {
      await supabase.from("daily_checks").update({ is_memory: true } as never)
        .eq("user_id", m.user_id).eq("evidence_path", m.path);
    }
  }

  // ── Borrar del storage todo lo que NO sea recuerdo ───────────────────────
  const pathSet = new Set<string>();
  for (const c of candidates) {
    if (c.evidence_path && preserved.has(c.evidence_path)) continue;
    if (c.evidence_path) pathSet.add(c.evidence_path);
    if (c.evidence?.audio_path) pathSet.add(c.evidence.audio_path);
    if (c.evidence?.video_path) pathSet.add(c.evidence.video_path);
    if (c.evidence?.after_path) pathSet.add(c.evidence.after_path);
  }
  const paths = Array.from(pathSet);

  let filesRemoved = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    if (!chunk.length) continue;
    const { error: rmErr } = await supabase.storage.from("evidencias").remove(chunk);
    if (!rmErr) filesRemoved += chunk.length;
  }

  // ── Marcar purgados (no los recuerdos) y limpiar referencias de media ─────
  let checksUpdated = 0;
  const now = new Date().toISOString();
  for (const c of candidates) {
    if (c.evidence_path && preserved.has(c.evidence_path)) continue; // recuerdo: intacto
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

  return NextResponse.json({
    candidates: candidates.length,
    memoriesCreated: autoInserts.length,
    filesRemoved,
    checksUpdated,
  });
}
