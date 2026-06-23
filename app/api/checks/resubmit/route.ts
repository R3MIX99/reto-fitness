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

  const { checkId, evidencePath, oldEvidencePath } = await req.json() as { checkId: string; evidencePath: string; oldEvidencePath?: string | null };
  if (!checkId || !evidencePath) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Delete previous audit votes so the check returns to a clean pending state
  await admin.from("audits").delete().eq("check_id", checkId);

  // Update check: reset to pending with new evidence
  const { error: updateError } = await admin
    .from("daily_checks")
    .update({ status: "pending", evidence_path: evidencePath })
    .eq("id", checkId)
    .eq("user_id", user.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Delete old storage file (best-effort: different path = accumulated timestamp files)
  if (oldEvidencePath && oldEvidencePath !== evidencePath) {
    await admin.storage.from("evidencias").remove([oldEvidencePath]);
  }

  // Find the most recent auditor for this check
  type AuditRow = { reviewer_id: string };
  const { data: audits } = await admin
    .from("audits")
    .select("reviewer_id")
    .eq("check_id", checkId)
    .order("created_at", { ascending: false })
    .limit(1) as unknown as { data: AuditRow[] | null };

  const reviewerId = audits?.[0]?.reviewer_id;
  if (!reviewerId) return NextResponse.json({ ok: true });

  // Get owner name for the notification message
  type ProfileRow = { full_name: string | null };
  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single() as unknown as { data: ProfileRow | null };

  const ownerName = ownerProfile?.full_name ?? "Un jugador";

  // Insert in-app notification
  await admin.from("notifications").insert({
    user_id: reviewerId,
    type: "resubmit",
    title: "Nueva evidencia subida",
    body: `${ownerName} volvió a subir evidencia para revisión.`,
    read: false,
    metadata: { url: "/mis-auditorias" },
  });

  // Send push notification
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (publicKey && privateKey && email) {
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

    type SubRow = { endpoint: string; p256dh: string; auth: string };
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", reviewerId) as unknown as { data: SubRow[] | null };

    if (subs?.length) {
      const payload = JSON.stringify({
        title: "Nueva evidencia subida",
        body: `${ownerName} volvió a subir evidencia para revisión.`,
        url: "/mis-auditorias",
      });
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
