import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { checkId, evidencePath, oldEvidencePath, evidence, oldEvidence } = await req.json() as {
    checkId: string;
    evidencePath: string;
    oldEvidencePath?: string | null;
    evidence?: Record<string, unknown> | null;
    oldEvidence?: Record<string, unknown> | null;
  };
  if (!checkId || !evidencePath) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Identifica el check (usuario, fecha, tipo, meta) para reenviar TODAS sus
  // filas hermanas (una por grupo, fan-out) y no solo la del grupo que rechazó.
  type CheckRow = { user_id: string; check_date: string; kind: string; goal_id: string | null };
  const { data: check } = await admin
    .from("daily_checks")
    .select("user_id, check_date, kind, goal_id")
    .eq("id", checkId)
    .single() as unknown as { data: CheckRow | null };

  if (!check || check.user_id !== user.id) {
    return NextResponse.json({ error: "Check no encontrado" }, { status: 404 });
  }

  // NO borramos los audits: conservamos el vínculo con el revisor para que el
  // check reaparezca en "Mis auditorías" (Por revisar) y podamos notificarle.
  // Al re-auditar, el voto se actualiza (upsert) y sync_sibling_checks propaga.
  const baseFilter = (f: any) => { // eslint-disable-line
    f = f.eq("user_id", user.id).eq("check_date", check.check_date).eq("kind", check.kind);
    return check.goal_id ? f.eq("goal_id", check.goal_id) : f.is("goal_id", null);
  };

  // Reset a "pending" con la nueva evidencia (foto/video principal + rica) en
  // todas las filas hermanas.
  const { error: updateError } = await baseFilter(
    admin.from("daily_checks").update({ status: "pending", evidence_path: evidencePath, evidence: evidence ?? null })
  ) as unknown as { error: { message: string } | null };
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // IDs de las filas hermanas → revisores que ya las auditaron.
  type IdRow = { id: string };
  const { data: siblings } = await baseFilter(
    admin.from("daily_checks").select("id")
  ) as unknown as { data: IdRow[] | null };
  const siblingIds = (siblings ?? []).map((s) => s.id);

  type AuditRow = { reviewer_id: string };
  const { data: audits } = siblingIds.length
    ? await admin.from("audits").select("reviewer_id").in("check_id", siblingIds) as unknown as { data: AuditRow[] | null }
    : { data: null };
  const reviewerIds = Array.from(new Set((audits ?? []).map((a) => a.reviewer_id))).filter((id) => id !== user.id);

  // Borra del storage los archivos reemplazados (best-effort).
  const toRemove: string[] = [];
  if (oldEvidencePath && oldEvidencePath !== evidencePath) toRemove.push(oldEvidencePath);
  for (const key of ["audio_path", "video_path", "after_path"] as const) {
    const oldP = oldEvidence?.[key] as string | undefined;
    const newP = evidence?.[key] as string | undefined;
    if (oldP && oldP !== newP) toRemove.push(oldP);
  }
  if (toRemove.length) await admin.storage.from("evidencias").remove(toRemove);

  if (!reviewerIds.length) return NextResponse.json({ ok: true });

  // Nombre del dueño para el mensaje.
  type ProfileRow = { full_name: string | null };
  const { data: ownerProfile } = await admin
    .from("profiles").select("full_name").eq("id", user.id).single() as unknown as { data: ProfileRow | null };
  const ownerName = ownerProfile?.full_name ?? "Un jugador";

  const title = "Tienes una evidencia por revisar";
  const body = `${ownerName} volvió a subir su evidencia. Revísala de nuevo.`;

  // Notificaciones in-app (una por revisor).
  await admin.from("notifications").insert(
    reviewerIds.map((rid) => ({
      user_id: rid,
      type: "resubmit",
      title,
      body,
      read: false,
      metadata: { url: "/mis-auditorias" },
    }))
  );

  // Push a cada revisor.
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (publicKey && privateKey && email) {
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    type SubRow = { endpoint: string; p256dh: string; auth: string };
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", reviewerIds) as unknown as { data: SubRow[] | null };
    if (subs?.length) {
      const payload = JSON.stringify({ title, body, url: "/mis-auditorias" });
      await Promise.allSettled(
        subs.map((s) =>
          webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          )
        )
      );
    }
  }

  return NextResponse.json({ ok: true });
}
