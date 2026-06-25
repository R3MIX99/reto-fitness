import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import webpush from "web-push";

type TransferEvent = "requested" | "accepted" | "rejected";

// Envía push (best-effort) para eventos de transferencia de propiedad.
// La notificación in-app la generan los RPCs; aquí solo entregamos el push.
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { transferId, event } = await req.json() as { transferId: string; event: TransferEvent };
  if (!transferId || !event) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  type TransferRow = { group_id: string; from_user: string; to_user: string };
  const { data: t } = await admin
    .from("group_transfers")
    .select("group_id, from_user, to_user")
    .eq("id", transferId)
    .single() as unknown as { data: TransferRow | null };
  if (!t) return NextResponse.json({ ok: true });

  const { data: group } = await admin
    .from("groups").select("name").eq("id", t.group_id).single() as unknown as { data: { name: string } | null };
  const groupName = group?.name ?? "tu grupo";

  // Destinatario del push y mensaje según el evento
  let targetUser: string;
  let title: string;
  let body: string;

  if (event === "requested") {
    targetUser = t.to_user;
    const { data: from } = await admin
      .from("profiles").select("full_name").eq("id", t.from_user).single() as unknown as { data: { full_name: string | null } | null };
    title = "Transferencia de grupo";
    body = `${from?.full_name ?? "Alguien"} quiere transferirte "${groupName}". Acepta o declina (48 h).`;
  } else {
    targetUser = t.from_user;
    const { data: to } = await admin
      .from("profiles").select("full_name").eq("id", t.to_user).single() as unknown as { data: { full_name: string | null } | null };
    if (event === "accepted") {
      title = "Transferencia realizada";
      body = `${to?.full_name ?? "El miembro"} aceptó. "${groupName}" ahora es suyo.`;
    } else {
      title = "Transferencia rechazada";
      body = `${to?.full_name ?? "El miembro"} rechazó la transferencia de "${groupName}".`;
    }
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !email) return NextResponse.json({ ok: true });

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

  type SubRow = { endpoint: string; p256dh: string; auth: string };
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", targetUser) as unknown as { data: SubRow[] | null };

  if (!subs?.length) return NextResponse.json({ ok: true });

  const payload = JSON.stringify({ title, body, url: "/grupo" });
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  return NextResponse.json({ ok: true });
}
